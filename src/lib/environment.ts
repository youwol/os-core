import { VirtualDOM } from '@youwol/flux-view'
import {
    AssetsBackend,
    AssetsGateway,
    ExplorerBackend,
} from '@youwol/http-clients'
import { RequestEvent } from '@youwol/http-primitives'
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs'
import { PlatformState } from './platform.state'

type url = string

/**
 * Those are the 'light' versions of the structures related to @youwol/os-explorer, a temporary workaround solution
 * instead using 'any'.
 *
 * Not sure about the best solution to use here.
 */
export interface ExplorerState {
    newAsset({
        parentNode,
        response$,
        pendingName,
    }: {
        parentNode:
            | ExplorerBackend.GetItemResponse
            | ExplorerBackend.GetFolderResponse
        response$: Observable<unknown>
        progress$?: Observable<RequestEvent>
        pendingName: string
    })
}

/**
 * End of light versions
 */

export function getEnvironmentSingleton(): ISharableEnvironment {
    return parent['@youwol/os-core'].Environment != Environment
        ? parent['@youwol/os-core'].getEnvironmentSingleton()
        : Environment
}

export class ISharableEnvironment {
    applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    favoriteGroups$: BehaviorSubject<ExplorerBackend.GetGroupResponse[]>
    favoriteFolders$: BehaviorSubject<ExplorerBackend.GetFolderResponse[]>
    favoriteItems$: BehaviorSubject<ExplorerBackend.GetEntityResponse[]>
}

export class Environment {
    static installManifest$: ReplaySubject<Manifest>
    static applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    static preferences$: ReplaySubject<Preferences>
    static favoriteGroups$: ReplaySubject<ExplorerBackend.GetGroupResponse[]>
    static favoriteFolders$: ReplaySubject<ExplorerBackend.GetFolderResponse[]>
    static favoriteItems$: ReplaySubject<ExplorerBackend.GetEntityResponse[]>
}

export type CdnClient = unknown

export type FluxView = unknown

export type TArgs = {
    platformState: PlatformState
}

export type Widgets =
    | VirtualDOM
    | VirtualDOM[]
    | ((TArgs) => VirtualDOM[])
    | ((TArgs) => VirtualDOM)

export interface Preferences {
    cssTheme: url
    desktop: Desktop
}

export interface Corporation {
    icon: VirtualDOM
    widgets?: Widgets
}

export interface TopBanner {
    corporation?: Corporation
    widgets?: Widgets
}

export interface Desktop {
    backgroundView: VirtualDOM
    topBanner?: TopBanner
    widgets: Widgets
    /**
     * @deprecated use 'topBanner attribute'
     */
    topBannerView?: VirtualDOM
}

export interface ContextMenuAction {
    icon: VirtualDOM
    name: string
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
    enabled: () => boolean | Promise<boolean>
}

export interface AssetPreview {
    icon: string
    name: string
    exe: () => VirtualDOM | Promise<VirtualDOM>
    applicable: () => boolean | Promise<boolean>
}

export interface OpeningApplication {
    cdnPackage: string
    parameters: { [k: string]: string }
    applicable: () => boolean | Promise<boolean>
}

export interface Application {
    cdnPackage: string
    version: string
    name: string
    standalone: boolean
    disabled?: boolean
    graphics?: {
        background?: VirtualDOM
        iconFile?: VirtualDOM
        iconApp?: VirtualDOM
    }
}

export type ApplicationDataValue = { [k: string]: unknown[] }

export interface AssetLightDescription {
    kind: string
    name: string
    assetId: string
    rawId: string
}

export interface Manifest {
    id: string | string[]

    contextMenuActions?: (params: {
        node:
            | ExplorerBackend.GetItemResponse
            | ExplorerBackend.GetFolderResponse
        explorer: ExplorerState
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
        fluxView: FluxView
    }) => ContextMenuAction[]

    assetPreviews?: (params: {
        asset: AssetsBackend.GetAssetResponse
        permissions: AssetsBackend.GetPermissionsResponse
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
        fluxView: FluxView
    }) => AssetPreview[]

    openWithApps?: (params: {
        asset: AssetLightDescription
    }) => OpeningApplication[]

    applications?: string[]

    applicationsData?: {
        [k: string]: ApplicationDataValue
    }

    favorites?: {
        items?: string[]
    }
}

export interface OpenWithParametrization {
    name?: string
    match: { [k: string]: string } | string
    parameters: { [k: string]: string } | string
}

export interface AppExecutionInfo {
    standalone: boolean
    parametrized: OpenWithParametrization[]
}

export interface ApplicationInfo {
    cdnPackage: string
    displayName: string
    graphics?: {
        background?: VirtualDOM
        fileIcon?: VirtualDOM
        appIcon?: VirtualDOM
    }
    execution: AppExecutionInfo
}
