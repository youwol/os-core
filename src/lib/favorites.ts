import {
    combineLatest,
    forkJoin,
    Observable,
    of,
    ReplaySubject,
    Subject,
} from 'rxjs'
import { RequestsExecutor } from './requests-executor'
import { map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import { Environment, GetGroupResponse } from './environment'
import {
    GetEntityResponse,
    GetFolderResponse,
} from '@youwol/http-clients/dist/lib/treedb-backend'

export interface Favorite {
    id: string
}
export interface FavoriteGroup extends Favorite {}
export interface FavoriteFolder extends Favorite {}
export interface FavoriteItem extends Favorite {
    type: string
}

type Target = 'favoriteGroups$' | 'favoriteFolders$' | 'favoriteItems$'
type TargetBody = 'favoriteGroups' | 'favoriteFolders' | 'favoriteItems'

export class FavoritesFacade {
    static initialFavorites$: Observable<{
        favoriteGroups: FavoriteGroup[]
        favoriteItems: FavoriteItem[]
        favoriteFolders: FavoriteFolder[]
    }>

    static toBodyName: Record<Target, TargetBody> = {
        favoriteGroups$: 'favoriteGroups',
        favoriteFolders$: 'favoriteFolders',
        favoriteItems$: 'favoriteItems',
    }

    static latest: {
        folders$: FavoriteFolder[]
        groups$: FavoriteGroup[]
        items$: FavoriteItem[]
    } = { folders$: undefined, groups$: undefined, items$: undefined }

    static getFolders$() {
        return FavoritesFacade._get$<GetFolderResponse>('favoriteFolders$')
    }
    static getGroups$() {
        return FavoritesFacade._get$<GetGroupResponse>('favoriteGroups$')
    }
    static getItems$() {
        return FavoritesFacade._get$<GetEntityResponse>('favoriteItems$')
    }

    static _get$<T>(target: Target): ReplaySubject<T[]> {
        if (Environment[target]) {
            return Environment[target] as unknown as ReplaySubject<T[]>
        }
        if (!FavoritesFacade.initialFavorites$) {
            FavoritesFacade.initialFavorites$ =
                RequestsExecutor.getFavorites().pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    tap(
                        ({
                            favoriteGroups,
                            favoriteItems,
                            favoriteFolders,
                        }) => {
                            this.latest.items$ = favoriteItems
                            this.latest.folders$ = favoriteFolders
                            this.latest.groups$ = favoriteGroups
                        },
                    ),
                )
        }
        Environment[target as string] = new ReplaySubject(1)
        Environment[target as string].subscribe((items) => {
            FavoritesFacade.latest[target] = items.map((i) => ({
                id: getId(target, i),
            }))
        })
        FavoritesFacade.initialFavorites$
            .pipe(
                map((resp) => resp[FavoritesFacade.toBodyName[target]]),
                mergeMap((items: unknown[]) => {
                    if (items.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        items.map((item: Favorite) =>
                            getFavoriteResponse$(target, item.id),
                        ),
                    )
                }),
            )
            .subscribe((favorites) => {
                Environment[target].next(favorites)
            })
        return Environment[target] as unknown as ReplaySubject<T[]>
    }

    static refresh(modifiedId: string) {
        function updateIfNeeded<TResp>(
            target: Target,
            elements: TResp[],
            getFunction$: () => Subject<TResp[]>,
        ) {
            if (!elements.find((g) => getId(target, g) == modifiedId)) {
                return
            }
            getFavoriteResponse$<TResp>(target, modifiedId).subscribe(
                (group) => {
                    const filtered = elements.filter(
                        (f) => getId(target, f) != modifiedId,
                    )
                    getFunction$().next(filtered.concat(group))
                },
            )
        }
        combineLatest([
            FavoritesFacade.getGroups$(),
            FavoritesFacade.getFolders$(),
            FavoritesFacade.getItems$(),
        ])
            .pipe(take(1))
            .subscribe(([groups, folders, items]) => {
                updateIfNeeded<GetGroupResponse>(
                    'favoriteGroups$',
                    groups,
                    FavoritesFacade.getGroups$,
                )
                updateIfNeeded<GetFolderResponse>(
                    'favoriteFolders$',
                    folders,
                    FavoritesFacade.getFolders$,
                )
                updateIfNeeded<GetEntityResponse>(
                    'favoriteItems$',
                    items,
                    FavoritesFacade.getItems$,
                )
            })
    }

    static remove(deletedId: string) {
        combineLatest([
            FavoritesFacade.getGroups$(),
            FavoritesFacade.getFolders$(),
            FavoritesFacade.getItems$(),
        ])
            .pipe(take(1))
            .subscribe(([groups, folders, items]) => {
                if (groups.find((g) => g.id == deletedId)) {
                    this.toggleFavoriteGroup(deletedId)
                }
                if (
                    folders.find(
                        (f) => getId('favoriteFolders$', f) == deletedId,
                    )
                ) {
                    this.toggleFavoriteFolder(deletedId)
                }
                if (
                    items.find((i) => getId('favoriteItems$', i) == deletedId)
                ) {
                    this.toggleFavoriteItem(deletedId)
                }
            })
    }

    static toggleFavoriteFolder(folderId: string) {
        FavoritesFacade.toggleFavorites('favoriteFolders$', { id: folderId })
    }

    static toggleFavoriteGroup(id: string) {
        FavoritesFacade.toggleFavorites('favoriteGroups$', { id })
    }

    static toggleFavoriteItem(treeId: string) {
        FavoritesFacade.toggleFavorites('favoriteItems$', { id: treeId })
    }

    static toggleFavorites(target: Target, newElement: Favorite) {
        let actualFavorites = []
        let others = {}
        combineLatest([
            FavoritesFacade.getGroups$(),
            FavoritesFacade.getFolders$(),
            FavoritesFacade.getItems$(),
        ])
            .pipe(take(1))
            .subscribe(([favoriteGroups, favoriteFolders, favoriteItems]) => {
                if (target == 'favoriteGroups$') {
                    actualFavorites = favoriteGroups
                    others = {
                        favoriteItems: favoriteItems.map((i) => ({
                            id: getId('favoriteItems$', i),
                        })),
                        favoriteFolders: favoriteFolders.map((i) => ({
                            id: getId('favoriteFolders$', i),
                        })),
                    }
                }
                if (target == 'favoriteFolders$') {
                    actualFavorites = favoriteFolders
                    others = {
                        favoriteItems: favoriteItems.map((i) => ({
                            id: getId('favoriteItems$', i),
                        })),
                        favoriteGroups: favoriteGroups.map((i) => ({
                            id: getId('favoriteGroups$', i),
                        })),
                    }
                }
                if (target == 'favoriteItems$') {
                    actualFavorites = favoriteItems
                    others = {
                        favoriteFolders: favoriteFolders.map((i) => ({
                            id: getId('favoriteFolders$', i),
                        })),
                        favoriteGroups: favoriteGroups.map((i) => ({
                            id: getId('favoriteGroups$', i),
                        })),
                    }
                }
                const filtered = actualFavorites.filter(
                    (item) => getId(target, item) != newElement.id,
                )
                if (filtered.length != actualFavorites.length) {
                    const items = filtered
                    RequestsExecutor.saveFavorites({
                        ...others,
                        [FavoritesFacade.toBodyName[target]]: items.map(
                            (item) => ({
                                id: getId(target, item),
                            }),
                        ),
                    } as any).subscribe()
                    FavoritesFacade[target].next(items)
                    return
                }
                getFavoriteResponse$(target, newElement.id).subscribe(
                    (resp) => {
                        const items = [...actualFavorites, resp]
                        RequestsExecutor.saveFavorites({
                            ...others,
                            [FavoritesFacade.toBodyName[target]]: items.map(
                                (item) => ({
                                    id: getId(target, item),
                                }),
                            ),
                        } as any).subscribe()
                        FavoritesFacade[target].next(items)
                    },
                )
            })
    }
}

function getFavoriteResponse$<T>(target: Target, id: string): Observable<T> {
    const client = new AssetsGateway.Client().treedb
    switch (target) {
        case 'favoriteItems$':
            return client
                .getEntity$({ entityId: id })
                .pipe(raiseHTTPErrors()) as Observable<T>
        case 'favoriteFolders$':
            return client
                .getFolder$({ folderId: id })
                .pipe(raiseHTTPErrors()) as Observable<T>
        case 'favoriteGroups$':
            return of({ id, path: window.atob(id) } as unknown) as Observable<T>
    }
    return of(undefined)
}

function getId(target: Target, item: any) {
    if (target == 'favoriteItems$') {
        return item.entity.itemId || this.entity.folderId
    }
    if (target == 'favoriteFolders$') {
        return item.folderId
    }
    if (target == 'favoriteGroups$') {
        return item.id
    }
}
