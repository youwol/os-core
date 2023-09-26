import { combineLatest, Observable, of, Subject } from 'rxjs'
import {
    AssetsGateway,
    CdnSessionsStorage,
    AssetsBackend,
} from '@youwol/http-clients'

import {
    dispatchHTTPErrors,
    HTTPError,
    send$,
    Json,
} from '@youwol/http-primitives'
import { delay, map, mergeMap } from 'rxjs/operators'
import { Favorite } from './favorites'
import { Installer } from './installer'

export const debugDelay = 0

export function isLocalYouwol() {
    return window.location.hostname == 'localhost'
}

export class RequestsExecutor {
    static error$ = new Subject<HTTPError>()
    static assetsGtwClient = new AssetsGateway.Client()

    static renameFolder(folderId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .updateFolder$({ folderId, body: { name: newName } })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static renameItem(itemId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .updateItem$({ itemId, body: { name: newName } })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static renameAsset(assetId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.assets
            .updateAsset$({ assetId, body: { name: newName } })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static trashItem(itemId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .trashItem$({ itemId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getItem(itemId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .getItem$({
                itemId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static trashFolder(folderId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .trashFolder$({
                folderId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static deleteDrive(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .deleteDrive$({ driveId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getUserInfo() {
        return RequestsExecutor.assetsGtwClient.getUserInfo$()
    }

    static getDefaultDrive(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .getDefaultDrive$({ groupId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static purgeDrive(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .purgeDrive$({ driveId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static createFolder(
        parentFolderId: string,
        body: { name: string; folderId: string },
    ) {
        return RequestsExecutor.assetsGtwClient.explorer
            .createFolder$({
                parentFolderId,
                body,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static move(targetId: string, destinationFolderId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .move$({
                body: {
                    targetId,
                    destinationFolderId,
                },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static borrow(itemId: string, destinationFolderId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .borrow$({
                itemId,
                body: {
                    destinationFolderId,
                },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getPath(folderId: string) {
        return new AssetsGateway.Client().explorer
            .getPathFolder$({
                folderId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getAsset(
        assetId: string,
    ): Observable<AssetsBackend.GetAssetResponse> {
        return RequestsExecutor.assetsGtwClient.assets
            .getAsset$({ assetId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getPermissions(
        assetId: string,
    ): Observable<AssetsBackend.GetPermissionsResponse> {
        return RequestsExecutor.assetsGtwClient.assets
            .getPermissions$({ assetId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static uploadLocalAsset(assetId: string) {
        if (!isLocalYouwol()) {
            return of(undefined)
        }

        return send$(
            'upload',
            `${window.location.origin}/admin/environment/upload/${assetId}`,
            { method: 'POST' },
        ).pipe(dispatchHTTPErrors(this.error$), delay(debugDelay))
    }

    static getFolder(folderId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .getFolder$({ folderId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getDrivesChildren(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .queryDrives$({ groupId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getFolderChildren(
        groupId: string,
        driveId: string,
        folderId: string,
    ) {
        return RequestsExecutor.assetsGtwClient.explorer
            .queryChildren$({ parentId: folderId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getDeletedItems(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorer
            .queryDeleted$({ driveId })
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

    static saveMissingManifestFavorites() {
        const client = new CdnSessionsStorage.Client()
        const displayedManifestFavorites = 'displayed-manifest-favorites'
        return combineLatest([
            RequestsExecutor.getFavorites(),
            Installer.getInstallManifest$().pipe(
                dispatchHTTPErrors(RequestsExecutor.error$),
            ),
            client
                .getData$({
                    packageName: '@youwol/os-core',
                    dataName: displayedManifestFavorites,
                })
                .pipe(
                    dispatchHTTPErrors(RequestsExecutor.error$),
                    map((d) => d as { items?: string[] }),
                ),
        ]).pipe(
            mergeMap(([favorites, manifest, displayed]) => {
                const manifestItemsFavorites = manifest?.favorites?.items || []
                const displayedItems = displayed?.items || []
                const missingDisplayed = manifestItemsFavorites.filter(
                    (favorite) => !displayedItems.includes(favorite),
                )

                if (missingDisplayed.length === 0) {
                    return of(favorites)
                }
                const newFavorites = {
                    ...favorites,
                    favoriteItems: [
                        ...favorites.favoriteItems,
                        ...missingDisplayed.map((id) => ({ id })),
                    ],
                }
                return RequestsExecutor.saveFavorites(newFavorites).pipe(
                    mergeMap(() =>
                        client.postData$({
                            packageName: '@youwol/os-core',
                            dataName: displayedManifestFavorites,
                            body: { items: manifestItemsFavorites },
                        }),
                    ),
                    map(() => newFavorites),
                )
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
