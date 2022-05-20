import { VirtualDOM } from '@youwol/flux-view'
import {
    AssetsBackend,
    AssetsGateway,
    TreedbBackend,
} from '@youwol/http-clients'
import { ReplaySubject } from 'rxjs'

type url = string
// To be replaced when @youwol/os-explorer available
type ExplorerState = any

export function getEnvironmentSingleton(): IEnvironment {
    return parent['@youwol/os-core'].Environment != Environment
        ? parent['@youwol/os-core'].getEnvironmentSingleton()
        : Environment
}

export class IEnvironment {
    installManifest$: ReplaySubject<Manifest>
    applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    preferences$: ReplaySubject<Preferences>
    favoriteGroups$: ReplaySubject<GetGroupResponse[]>
    favoriteFolders$: ReplaySubject<GetFolderResponse[]>
    favoriteItems$: ReplaySubject<GetEntityResponse[]>
}

export class Environment {
    static installManifest$: ReplaySubject<Manifest>
    static applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    static preferences$: ReplaySubject<Preferences>
}

export interface CdnClient {}

export interface FluxView {}

export interface Preferences {
    profile: Profile
    cssTheme: url
    desktop: Desktop
}

export interface Profile {
    avatar: VirtualDOM
}

export interface Desktop {
    backgroundView: VirtualDOM
    topBannerView: VirtualDOM
}

export interface ContextMenuAction {
    icon: string
    name: string
    authorized: boolean
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
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

export interface Manifest {
    id: string | string[]

    contextMenuActions?: (params: {
        node: ItemNode | FolderNode
        explorer: ExplorerState
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
    }) => ContextMenuAction[]

    assetPreviews?: (params: {
        asset: AssetsBackend.GetAssetResponse
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
        fluxView: FluxView
    }) => AssetPreview[]

    openWithApps?: (params: {
        node: ItemNode | FolderNode
    }) => OpeningApplication[]

    applications?: string[]

    applicationsData?: {
        [k: string]: ApplicationDataValue
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

export interface ExplorerNode {
    explorerId: string
    addStatus({ type, id }: { type: string; id: string })
    removeStatus({ type, id }: { type: string; id: string })
}

export interface DriveNode extends ExplorerNode {}

export interface ItemNode extends ExplorerNode {
    groupId: string
    driveId: string
    assetId: string
    rawId: string
    name: string
    kind: string
    metadata: any
    borrowed: boolean
}

export function isInstanceOfItemNode(node: unknown): node is ItemNode {
    return (
        (node as ItemNode).assetId != undefined &&
        (node as ItemNode).rawId != undefined &&
        (node as ItemNode).explorerId != undefined
    )
}

export interface FolderNode extends ExplorerNode {
    groupId: string
    driveId: string
    name: string
    folderId: string
    parentFolderId: string
}

export function isInstanceOfFolderNode(node: unknown): node is FolderNode {
    return (
        (node as FolderNode).parentFolderId != undefined &&
        (node as FolderNode).folderId != undefined
    )
}

export interface GetGroupResponse {
    id: string
    path: string
}
type GetFolderResponse = TreedbBackend.GetFolderResponse
type GetEntityResponse = TreedbBackend.GetEntityResponse
