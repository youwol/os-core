import { Observable, of, Subject } from 'rxjs'
import {
    AssetsGateway,
    CdnSessionsStorage,
    dispatchHTTPErrors,
    HTTPError,
    send$,
    Json,
} from '@youwol/http-clients'

import { delay, map, tap } from 'rxjs/operators'

import { v4 as uuidv4 } from 'uuid'
import { Favorite } from './favorites'
import { FolderNode, ItemNode, DriveNode } from './environment'

export const debugDelay = 0

// to be replaced by using types declaration of @youwol/os-explorer
//type BrowserNode = any
//type DriveNode = any

export function isLocalYouwol() {
    return window.location.hostname == 'localhost'
}

export class RequestsExecutor {
    static error$ = new Subject<HTTPError>()
    static assetsGtwClient = new AssetsGateway.Client()

    static renameFolder(folderId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders.rename$(
            folderId,
            { name: newName },
        )
    }

    static renameAsset(itemId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.assetsDeprecated.update$(
            itemId,
            {
                name: newName,
            },
        )
    }

    static deleteItem(node: ItemNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.items.delete$(
            node.explorerId,
        )
    }

    static getItem(itemId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.items.get$(
            itemId,
        )
    }

    static deleteFolder(node: FolderNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders.delete$(
            node.folderId,
        )
    }

    static deleteDrive(node: DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.drives.delete$(
            node.explorerId,
        )
    }

    static getUserInfo() {
        return RequestsExecutor.assetsGtwClient.getUserInfo$()
    }

    static getDefaultDrive(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.groups
            .getDefaultDrive$(groupId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static purgeDrive(driveId: string) {
        return RequestsExecutor.assetsGtwClient.treedb
            .purgeDrive$({ driveId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static createFolder(
        node: DriveNode | FolderNode,
        body: { name: string; folderId: string },
    ) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders
            .create$(node.explorerId, body)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static move(target: ItemNode | FolderNode, folder: FolderNode | DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated
            .move$(target.explorerId, {
                destinationFolderId: folder.explorerId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static borrow(
        target: ItemNode | FolderNode,
        folder: FolderNode | DriveNode,
    ) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated
            .borrowItem$(target.explorerId, {
                destinationFolderId: folder.explorerId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getPath(folderId: string) {
        return new AssetsGateway.Client().treedb
            .getPathFolder$({
                folderId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getAsset(assetId: string): Observable<AssetsGateway.Asset> {
        return RequestsExecutor.assetsGtwClient.assetsDeprecated
            .get$(assetId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static uploadLocalAsset(assetId: string, node?: ItemNode) {
        if (!isLocalYouwol()) {
            return of(undefined)
        }

        const uid = uuidv4()
        node && node.addStatus({ type: 'request-pending', id: uid })

        return send$(
            'upload',
            `${window.location.origin}/admin/environment/upload/${assetId}`,
            { method: 'POST' },
        ).pipe(
            dispatchHTTPErrors(this.error$),
            delay(debugDelay),
            tap(
                () =>
                    node &&
                    node.removeStatus({ type: 'request-pending', id: uid }),
            ),
        )
    }

    static getFolder(folderId: string) {
        return RequestsExecutor.assetsGtwClient.treedb
            .getFolder$({ folderId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getDrivesChildren(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.groups
            .queryDrives$(groupId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getFolderChildren(
        groupId: string,
        driveId: string,
        folderId: string,
    ) {
        return RequestsExecutor.assetsGtwClient.treedb
            .queryChildren$({ parentId: folderId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getDeletedItems(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.drives
            .queryDeletedItems$(driveId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static saveFavorites({
        favoriteGroups,
        favoriteFolders,
        favoriteItems,
    }: {
        favoriteGroups: Favorite[]
        favoriteFolders: Favorite[]
        favoriteItems: Favorite[]
    }) {
        return new CdnSessionsStorage.Client()
            .postData$({
                packageName: '@youwol/os-core',
                dataName: 'favorites',
                body: {
                    favoriteGroups: favoriteGroups,
                    favoriteFolders: favoriteFolders,
                    favoriteItems: favoriteItems,
                } as unknown as Json,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getFavorites() {
        return new CdnSessionsStorage.Client()
            .getData$({
                packageName: '@youwol/os-core',
                dataName: 'favorites',
            })
            .pipe(
                dispatchHTTPErrors(RequestsExecutor.error$),
                map((data) => {
                    const getValue = (name) =>
                        data[name] && Array.isArray(data[name])
                            ? data[name]
                            : []

                    return {
                        favoriteFolders: getValue('favoriteFolders'),
                        favoriteItems: getValue('favoriteItems'),
                        favoriteGroups: getValue('favoriteGroups'),
                    }
                }),
            )
    }

    static saveInstallerScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        return new CdnSessionsStorage.Client()
            .postData$({
                packageName: '@youwol/os-core',
                dataName: 'installer',
                body: { tsSrc, jsSrc },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getInstallerScript(): Observable<{ tsSrc: string; jsSrc: string }> {
        return new CdnSessionsStorage.Client()
            .getData$({
                packageName: '@youwol/os-core',
                dataName: 'installer',
            })
            .pipe(dispatchHTTPErrors(this.error$)) as Observable<{
            tsSrc: string
            jsSrc: string
        }>
    }

    static savePreferencesScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        return new CdnSessionsStorage.Client()
            .postData$({
                packageName: '@youwol/os-core',
                dataName: 'preferences',
                body: { tsSrc, jsSrc },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getPreferencesScript(): Observable<{
        tsSrc: string
        jsSrc: string
    }> {
        return new CdnSessionsStorage.Client()
            .getData$({
                packageName: '@youwol/os-core',
                dataName: 'preferences',
            })
            .pipe(dispatchHTTPErrors(this.error$)) as Observable<{
            tsSrc: string
            jsSrc: string
        }>
    }
}
