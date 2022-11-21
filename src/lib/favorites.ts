import {
    BehaviorSubject,
    combineLatest,
    forkJoin,
    Observable,
    of,
    Subject,
} from 'rxjs'
import { RequestsExecutor } from './requests-executor'
import { map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import {
    AssetsGateway,
    ExplorerBackend,
    raiseHTTPErrors,
} from '@youwol/http-clients'
import { getEnvironmentSingleton } from './environment'

export interface Favorite {
    id: string
}
export type FavoriteGroup = Favorite
export type FavoriteFolder = Favorite
export interface FavoriteItem extends Favorite {
    type: string
}

type AnyFavoriteResponse =
    | ExplorerBackend.GetFolderResponse
    | ExplorerBackend.GetGroupResponse
    | ExplorerBackend.GetItemResponse
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

    static getFolders$() {
        return FavoritesFacade._get$<ExplorerBackend.GetFolderResponse>(
            'favoriteFolders$',
        )
    }
    static getGroups$() {
        return FavoritesFacade._get$<ExplorerBackend.GetGroupResponse>(
            'favoriteGroups$',
        )
    }
    static getItems$() {
        return FavoritesFacade._get$<ExplorerBackend.GetItemResponse>(
            'favoriteItems$',
        )
    }

    static _get$<T>(target: Target): BehaviorSubject<T[]> {
        const environment = getEnvironmentSingleton()
        if (environment[target]) {
            return environment[target] as unknown as BehaviorSubject<T[]>
        }
        environment[target as string] = new BehaviorSubject([])

        if (!FavoritesFacade.initialFavorites$) {
            FavoritesFacade.initialFavorites$ =
                RequestsExecutor.getFavorites().pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                )
        }
        FavoritesFacade.initialFavorites$
            .pipe(
                map((resp) => resp[FavoritesFacade.toBodyName[target]]),
                mergeMap((items: unknown[]) => {
                    if (items.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        items.map((item: Favorite) =>
                            getFavoriteResponse$<T>(target, item.id),
                        ),
                    )
                }),
            )
            .subscribe((favorites) => {
                environment[target].next(favorites)
            })
        return environment[target as string] as unknown as BehaviorSubject<T[]>
    }

    static refresh(modifiedId: string) {
        function updateIfNeeded(
            target: Target,
            elements: AnyFavoriteResponse[],
            getFunction$: () => Subject<AnyFavoriteResponse[]>,
        ) {
            if (!elements.find((g) => getId(target, g) == modifiedId)) {
                return
            }
            getFavoriteResponse$(target, modifiedId).subscribe((group) => {
                const filtered = elements.filter(
                    (f) => getId(target, f) != modifiedId,
                )
                getFunction$().next(
                    filtered.concat(group as AnyFavoriteResponse),
                )
            })
        }
        combineLatest([
            FavoritesFacade.getGroups$(),
            FavoritesFacade.getFolders$(),
            FavoritesFacade.getItems$(),
        ])
            .pipe(take(1))
            .subscribe(([groups, folders, items]) => {
                updateIfNeeded(
                    'favoriteGroups$',
                    groups,
                    FavoritesFacade.getGroups$,
                )
                updateIfNeeded(
                    'favoriteFolders$',
                    folders,
                    FavoritesFacade.getFolders$,
                )
                updateIfNeeded(
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
                const items$ =
                    filtered.length != actualFavorites.length
                        ? of(filtered)
                        : getFavoriteResponse$(target, newElement.id).pipe(
                              map((resp) => [...actualFavorites, resp]),
                          )
                items$
                    .pipe(
                        take(1),
                        tap((items) => {
                            FavoritesFacade._get$(target).next(items)
                        }),
                        mergeMap((items) => {
                            return RequestsExecutor.saveFavorites({
                                ...others,
                                [FavoritesFacade.toBodyName[target]]: items.map(
                                    (item) => ({
                                        id: getId(target, item),
                                    }),
                                ),
                            } as {
                                favoriteGroups: Favorite[]
                                favoriteFolders: Favorite[]
                                favoriteItems: Favorite[]
                            })
                        }),
                    )
                    .subscribe()
            })
    }
}

function getFavoriteResponse$<T>(target: Target, id: string): Observable<T> {
    const client = new AssetsGateway.Client().explorer
    switch (target) {
        case 'favoriteItems$':
            return client
                .getItem$({ itemId: id })
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

function getId(target: Target, item: AnyFavoriteResponse) {
    if (
        target == 'favoriteItems$' &&
        ExplorerBackend.isInstanceOfItemResponse(item)
    ) {
        return item.itemId || this.folderId
    }
    if (
        target == 'favoriteFolders$' &&
        ExplorerBackend.isInstanceOfFolderResponse(item)
    ) {
        return item.folderId
    }
    if (
        target == 'favoriteGroups$' &&
        ExplorerBackend.isInstanceOfGroupResponse(item)
    ) {
        return item.id
    }
}
