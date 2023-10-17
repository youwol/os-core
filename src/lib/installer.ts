import { install } from '@youwol/cdn-client'
import * as cdnClient from '@youwol/cdn-client'
import { forkJoin, from, Observable, of, ReplaySubject } from 'rxjs'
import { RequestsExecutor } from './requests-executor'
import { map, mergeMap, shareReplay, take } from 'rxjs/operators'
import { ChildApplicationAPI } from './platform.state'

import {
    ApplicationDataValue,
    ApplicationInfo,
    AssetLightDescription,
    Environment,
    getEnvironmentSingleton,
    Manifest,
    OpenWithParametrization,
} from './environment'

type TInstaller = (installer: Installer) => Promise<Installer>

export function evaluateMatch(
    data: unknown,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.match == 'string') {
        return new Function(parametrization.match)()(data)
    }
    return Object.entries(parametrization.match).reduce((acc, [k, v]) => {
        return acc && data[k] == v
    }, true)
}

export function evaluateParameters(
    node: unknown,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.parameters == 'string') {
        return new Function(parametrization.parameters)()(node)
    }
    return Object.entries(parametrization.parameters).reduce((acc, [k, v]) => {
        return { ...acc, [k]: node[v] }
    }, {})
}

export class Installer {
    static forceDefault = false

    public readonly libraryManifests = new Set<string>()
    public readonly generatorManifests = new Set<TInstaller>()
    public readonly resolvedManifests = new Set<Manifest>()
    public readonly cdnClient = cdnClient

    static defaultInstallJsScript = `
async function install(installer){
    return installer.with({
        fromLibraries:["@youwol/installers-youwol.youwolDev"]
    })
}
return install
`
    static defaultInstallTsScript = `
import {Installer} from './installer'

async function install(installer: Installer): Promise<Installer> {
    return installer.with({
        fromLibraries:["@youwol/installers-youwol.youwolDev"]
    })
}
return install
`
    static setInstallerScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        return Installer.tryInstallerScript({ jsSrc }).then(
            (manifest: Manifest) => {
                RequestsExecutor.saveInstallerScript({
                    tsSrc,
                    jsSrc,
                }).subscribe()
                Installer.getInstallManifest$().next(manifest)
            },
        )
    }
    static async tryInstallerScript({ jsSrc }): Promise<Manifest> {
        return new Function(jsSrc)()(new Installer()).then((installer) =>
            installer.resolve(),
        )
    }

    static getDefaultInstaller() {
        return {
            tsSrc: Installer.defaultInstallTsScript,
            jsSrc: Installer.defaultInstallJsScript,
        }
    }

    static getInstallerScript$() {
        if (Installer.forceDefault) {
            return of(Installer.getDefaultInstaller())
        }

        return RequestsExecutor.getInstallerScript().pipe(
            map(({ jsSrc, tsSrc }) =>
                jsSrc
                    ? { jsSrc, tsSrc }
                    : {
                          jsSrc: Installer.defaultInstallJsScript,
                          tsSrc: Installer.defaultInstallTsScript,
                      },
            ),
        )
    }

    static getInstallManifest$() {
        if (Environment.installManifest$) {
            return Environment.installManifest$
        }
        Environment.installManifest$ = new ReplaySubject<Manifest>(1)

        Installer.getInstallerScript$()
            .pipe(
                mergeMap(({ jsSrc }) =>
                    from(Function(jsSrc)()(new Installer())),
                ),
                mergeMap((installer: Installer) => from(installer.resolve())),
            )
            .subscribe((manifest: Manifest) => {
                Environment.installManifest$.next(manifest)
            })
        return Environment.installManifest$
    }

    static getApplicationsInfo$() {
        if (getEnvironmentSingleton().applicationsInfo$) {
            return getEnvironmentSingleton().applicationsInfo$
        }
        getEnvironmentSingleton().applicationsInfo$ = new ReplaySubject<
            ApplicationInfo[]
        >(1)
        this.getInstallManifest$()
            .pipe(
                mergeMap((manifest) => {
                    if (manifest.applications.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        manifest.applications.map((cdnPackage) => {
                            return RequestsExecutor.getApplicationInfo({
                                cdnPackage,
                                version: 'latest',
                            })
                        }),
                    ).pipe(
                        map((infos: (ApplicationInfo | undefined)[]) =>
                            infos.filter((info) => info != undefined),
                        ),
                    )
                }),
            )
            .subscribe((d: ApplicationInfo[]) => {
                getEnvironmentSingleton().applicationsInfo$.next(d)
            })
        return getEnvironmentSingleton().applicationsInfo$
    }

    constructor(
        params: {
            libraryManifests?
            generatorManifests?
            resolvedManifests?
        } = {},
    ) {
        Object.assign(this, params)
    }

    with(resolvableManifests: {
        fromLibraries?: string[]
        fromInstallingFunctions?: TInstaller[]
        fromManifests?: Manifest[]
    }) {
        const libraries = resolvableManifests.fromLibraries || []
        const generators = resolvableManifests.fromInstallingFunctions || []
        const manifests = resolvableManifests.fromManifests || []

        return new Installer({
            libraryManifests: new Set([...this.libraryManifests, ...libraries]),
            generatorManifests: new Set([
                ...this.generatorManifests,
                ...generators,
            ]),
            resolvedManifests: new Set([
                ...this.resolvedManifests,
                ...manifests,
            ]),
        })
    }

    async resolve(
        depth = 0,
        installed: unknown[] = [],
    ): Promise<Manifest | Manifest[]> {
        if (depth == 100) {
            throw Error(
                "Maximum recursion depth reached during installer's resolution",
            )
        }
        await install({
            modules: [...this.libraryManifests].map(
                (path) => path.split('.')[0],
            ),
        })
        const generatorsFromLibs = await Promise.all(
            [...this.libraryManifests].map((libraryPath) => {
                const libraryName = libraryPath.split('.')[0]
                const parent = libraryPath
                    .split('.')
                    .slice(1)
                    .reduce((acc, e) => acc[e], window[libraryName])

                if (!parent.install) {
                    console.error('ERROR can not find library ', {
                        libraryName,
                        libraryPath,
                    })
                    return undefined
                }
                return parent.install
            }),
        )
        const allGenerators = [
            ...this.generatorManifests,
            ...generatorsFromLibs.filter((d) => d != undefined),
        ]
        const generatorManifests = await Promise.all(
            [...new Set(allGenerators)].map((generator) => {
                if (installed.includes(generator)) {
                    return Promise.resolve(undefined)
                }
                installed.push(generator)
                return generator(new Installer()).then((installer) =>
                    installer.resolve(depth + 1, installed),
                )
            }),
        )
        const resolved = [...this.resolvedManifests, ...generatorManifests]
            .filter((g) => g != undefined)
            .flat()

        if (depth != 0) {
            return resolved
        }
        const resolvedSet = [...new Set(resolved)].filter(
            (value, index, self) =>
                self.map((s) => s.id).indexOf(value.id) === index,
        )
        const id = resolvedSet.map((r) => r.id)
        return {
            id,
            contextMenuActions: (p) =>
                resolvedSet
                    .filter((s) => s.contextMenuActions)
                    .map((s) => s.contextMenuActions(p))
                    .flat(),
            assetPreviews: (p) =>
                resolvedSet
                    .filter((s) => s.assetPreviews)
                    .map((s) => s.assetPreviews(p))
                    .flat(),
            applications: resolvedSet
                .filter((s) => s.applications)
                .map((s) => s.applications)
                .flat(),
            openWithApps: (p) =>
                resolvedSet
                    .filter((s) => s.openWithApps)
                    .map((s) => s.openWithApps(p))
                    .flat(),
            applicationsData: mergeApplicationsData(
                resolvedSet
                    .filter((s) => s.applicationsData)
                    .map((s) => s.applicationsData),
            ),
            favorites: mergeFavorites(
                resolvedSet.filter((s) => s.favorites).map((s) => s.favorites),
            ),
        }
    }
}

function mergeApplicationsData(data: { [k: string]: ApplicationDataValue }[]) {
    type PackageId = string
    const allPackages = data.map((d) => Object.keys(d)).flat()

    return allPackages.reduce((acc, id: PackageId) => {
        const matchingPackageValues = data
            .filter((d) => d[id] != undefined)
            .map((d) => d[id])
        const allKeys = matchingPackageValues.map((d) => Object.keys(d)).flat()
        const uniques = (d) => {
            return [
                ...new Map(d.map((obj) => [JSON.stringify(obj), obj])).values(),
            ]
        }
        const mergedPackageData = allKeys.reduce((acc2, key) => {
            return {
                ...acc2,
                [key]: uniques(
                    matchingPackageValues
                        .map((pack) => pack[key])
                        .filter((value) => value != undefined)
                        .reduce((acc3, e) => [...acc3, ...e], []),
                ),
            }
        }, {})
        return { ...acc, [id]: mergedPackageData }
    }, {})
}

function mergeFavorites(data: { items?: string[]; applications?: string[] }[]) {
    const items = data.map((d) => d.items || []).flat()
    const applications = data.map((d) => d.applications || []).flat()
    return { items, applications }
}

function getFlatParametrizationList(appsInfo: ApplicationInfo[]) {
    return appsInfo
        .map((appInfo) =>
            appInfo.execution.parametrized.map((parametrization) => {
                return { appInfo, parametrization }
            }),
        )
        .flat()
}

export function defaultOpeningApp$<_T>(
    asset: AssetLightDescription,
): Observable<
    | {
          appInfo: ApplicationInfo
          parametrization: OpenWithParametrization
      }
    | undefined
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).find(
                ({ parametrization }) => evaluateMatch(asset, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function openingApps$<_T>(asset: AssetLightDescription): Observable<
    {
        appInfo: ApplicationInfo
        parametrization: OpenWithParametrization
    }[]
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).filter(
                ({ parametrization }) => evaluateMatch(asset, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function tryOpenWithDefault$(asset: AssetLightDescription) {
    return defaultOpeningApp$(asset).pipe(
        take(1),
        mergeMap((info: { appInfo; parametrization } | undefined) => {
            return info
                ? ChildApplicationAPI.getOsInstance().createInstance$({
                      cdnPackage: info.appInfo.cdnPackage,
                      parameters: evaluateParameters(
                          asset,
                          info.parametrization,
                      ),
                      focus: true,
                      version: 'latest',
                  })
                : of(undefined)
        }),
    )
}
