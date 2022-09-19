import { RequestsExecutor } from './requests-executor'

import {
    Corporation,
    getEnvironmentSingleton,
    Preferences,
} from './environment'
import { from, ReplaySubject } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import * as cdnClient from '@youwol/cdn-client'
import * as httpClients from '@youwol/http-clients'
import * as rxjs from 'rxjs'
import * as fluxView from '@youwol/flux-view'
import {
    defaultJsSrcSettings,
    defaultTsSrcSettings,
} from './preferences-default-codes'
import { VirtualDOM } from '@youwol/flux-view'
import { ChildApplicationAPI, PlatformState } from './platform.state'

export class PreferencesFacade {
    static setPreferencesScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        RequestsExecutor.savePreferencesScript({ tsSrc, jsSrc }).subscribe()
        new Function(jsSrc)()({
            rxjs,
            cdnClient,
            httpClients,
            fluxView,
            platformState: ChildApplicationAPI.getOsInstance(),
        }).then((preferences: Preferences) => {
            PreferencesFacade.getPreferences$().next(preferences)
        })
    }

    static getDefaultPreferences() {
        return {
            ts: defaultTsSrcSettings,
            js: defaultJsSrcSettings,
        }
    }

    static getPreferences$() {
        if (getEnvironmentSingleton().preferences$) {
            return getEnvironmentSingleton().preferences$
        }
        getEnvironmentSingleton().preferences$ = new ReplaySubject<Preferences>(
            1,
        )

        RequestsExecutor.getPreferencesScript()
            .pipe(
                map(({ jsSrc }) =>
                    jsSrc
                        ? { jsSrc }
                        : {
                              jsSrc: defaultJsSrcSettings,
                          },
                ),
                mergeMap(({ jsSrc }) =>
                    from(
                        Function(jsSrc)()({
                            rxjs,
                            cdnClient,
                            httpClients,
                            fluxView,
                            platformState: ChildApplicationAPI.getOsInstance(),
                        }),
                    ),
                ),
            )
            .subscribe((preferences: Preferences) => {
                getEnvironmentSingleton().preferences$.next(preferences)
            })
        return getEnvironmentSingleton().preferences$
    }

    static getPreferencesScript$() {
        return RequestsExecutor.getPreferencesScript().pipe(
            map(({ jsSrc, tsSrc }) =>
                jsSrc
                    ? { jsSrc, tsSrc }
                    : {
                          jsSrc: defaultJsSrcSettings,
                          tsSrc: defaultTsSrcSettings,
                      },
            ),
        )
    }
}

function extractWidgets(
    widgets: Widgets,
    args: { platformState: PlatformState },
): VirtualDOM[] {
    if (!widgets) {
        return []
    }
    if (typeof widgets === 'function') {
        const resolved = widgets(args)
        return Array.isArray(resolved) ? resolved : [resolved]
    }
    return Array.isArray(widgets) ? widgets : [widgets]
}

export class PreferencesExtractor {
    static getTopBannerWidgets(
        preferences: Preferences,
        { platformState }: { platformState: PlatformState },
    ): VirtualDOM[] {
        if (preferences.desktop.topBannerView) {
            return [preferences.desktop.topBannerView]
        }
        return extractWidgets(preferences.desktop?.topBanner?.widgets, {
            platformState,
        })
    }

    static getDesktopWidgets(
        preferences: Preferences,
        { platformState }: { platformState: PlatformState },
    ): VirtualDOM[] {
        return extractWidgets(preferences.desktop?.widgets, { platformState })
    }

    static getCorporationWidgets(
        preferences: Preferences,
        { platformState }: { platformState: PlatformState },
    ): VirtualDOM[] {
        return extractWidgets(
            preferences.desktop?.topBanner?.corporation?.widgets,
            { platformState },
        )
    }

    static getCorporation(preferences: Preferences): Corporation | undefined {
        return preferences.desktop.topBanner?.corporation
    }
}
