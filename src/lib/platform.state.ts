import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { BehaviorSubject, Observable, of, Subject } from 'rxjs'
import { filter, map, take, tap } from 'rxjs/operators'
import { PlatformEvent } from './platform.events'
import { RunningApp } from './running-app.view'
import { PreferencesFacade } from './preferences'
import { Installer } from './installer'

export function getExeUrl(exe: { cdnPackage; version; parameters }) {
    const base = `/applications/${exe.cdnPackage}/${exe.version}`
    if (Object.keys(exe.parameters).length == 0) {
        return base
    }

    const queryParams = Object.entries(exe.parameters).reduce(
        (acc, [k, v]) => `${acc}&${k}=${v}`,
        '',
    )
    return `${base}?${queryParams}`
}

export interface IPlatformHandler {
    runningApplications$: Observable<RunningApp[]>
    broadcastEvents$: Observable<PlatformEvent>

    createInstance$({
        cdnPackage,
        version,
        parameters,
        focus,
        title,
    }: {
        cdnPackage: string
        title?: string
        parameters?: { [key: string]: string }
        focus: boolean
        version: string
    })

    broadcastEvent(event: PlatformEvent)
}

export class ChildApplicationAPI {
    static getAppInstanceId() {
        return new URLSearchParams(window.location.search).get('instance-id')
    }

    static getOsInstance(): IPlatformHandler {
        return (
            parent['@youwol/os-core']?.PlatformState.instance ||
            new NoPlatformHandler()
        )
    }

    static setProperties({ snippet }: { snippet: AnyVirtualDOM }) {
        const os = ChildApplicationAPI.getOsInstance()
        if (!os) {
            return
        }
        const appInstanceId = ChildApplicationAPI.getAppInstanceId()
        os.runningApplications$
            .pipe(
                map((apps) =>
                    apps.find((app) => app.instanceId == appInstanceId),
                ),
                filter((app) => app != undefined),
                take(1),
            )
            .subscribe((app) => {
                app.setSnippet(snippet)
            })
    }
}

class NoPlatformHandler implements IPlatformHandler {
    public readonly runningApplications$ = new Subject<RunningApp[]>()
    public readonly broadcastEvents$ = new Subject<PlatformEvent>()

    createInstance$({
        cdnPackage,
        version,
        parameters,
        focus,
    }: {
        cdnPackage: string
        version: string
        parameters?: { [_key: string]: string }
        focus: boolean
    }) {
        const url = getExeUrl({ cdnPackage, version, parameters })
        focus ? window.open(url, '_self') : window.open(url, '_blank')
    }

    broadcastEvent(event: PlatformEvent) {
        this.broadcastEvents$.next(event)
    }
}

export function isPlatformInstance(p: IPlatformHandler): p is PlatformState {
    return (
        (p as PlatformState).type &&
        (p as PlatformState).type == 'PlatformState'
    )
}

export class PlatformState implements IPlatformHandler {
    public readonly type = 'PlatformState'

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(
        undefined,
    )
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    public readonly broadcastEvents$ = new Subject<PlatformEvent>()

    static instance: PlatformState

    static setSafeMode() {
        PreferencesFacade.forceDefault = true
        Installer.forceDefault = true
    }
    static setOsInstance(instance: PlatformState) {
        PlatformState.instance = instance
    }

    constructor() {
        PlatformState.setOsInstance(this)
    }

    getRunningApp(appId: string): RunningApp {
        return this.runningApplications$
            .getValue()
            .find((app) => app.instanceId === appId)
    }

    createInstance$({
        cdnPackage,
        version,
        parameters,
        focus,
        title,
    }: {
        cdnPackage: string
        title?: string
        version: string
        parameters?: { [_key: string]: string }
        focus: boolean
    }) {
        return of({}).pipe(
            tap(() => {
                const app = new RunningApp({
                    version,
                    state: this,
                    parameters,
                    title: title,
                    cdnPackage,
                })
                this.runningApplications$.next([
                    ...this.runningApplications$.getValue(),
                    app,
                ])
                focus && this.focus(app.instanceId)
            }),
        )
    }

    focus(instanceId: string) {
        const app = this.getRunningApp(instanceId)
        this.runningApplication$.next(app)
    }

    broadcastEvent(event: PlatformEvent) {
        this.broadcastEvents$.next(event)
    }

    setTopBannerViews(
        appId: string,
        {
            actionsView,
            youwolMenuView,
            userMenuView,
        }: {
            actionsView: AnyVirtualDOM
            youwolMenuView: AnyVirtualDOM
            userMenuView: AnyVirtualDOM
        },
    ) {
        const app = this.runningApplications$
            .getValue()
            .find((candidate) => candidate.instanceId === appId)
        if (!app) {
            // Happens when e.g. adding an app using an iframe element
            return
        }
        app.topBannerActions$.next(actionsView)
        app.topBannerUserMenu$.next(userMenuView)
        app.topBannerYouwolMenu$.next(youwolMenuView)
    }

    close(instanceId: string) {
        const app = this.getRunningApp(instanceId)
        app.terminateInstance()
        this.runningApplications$.next(
            this.runningApplications$.getValue().filter((d) => d != app),
        )
        this.runningApplication$.next(undefined)
    }

    expand(instanceId: string) {
        const app = this.getRunningApp(instanceId)
        window.open(app.url, '_blank')
    }

    minimize(instanceId: string) {
        const app = this.getRunningApp(instanceId)
        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(app)) {
            return
        }
        this.runningApplications$.next([
            ...this.runningApplications$.getValue(),
            app,
        ])
    }

    static childAppAPI: ChildApplicationAPI
}
