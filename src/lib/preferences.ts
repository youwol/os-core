import { RequestsExecutor } from './requests-executor'

import { Corporation, Environment, Preferences, Widgets } from './environment'
import { from, of, ReplaySubject } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import * as webpmClient from '@youwol/webpm-client'
import * as httpClients from '@youwol/http-clients'
import * as rxjs from 'rxjs'
import * as rxDOM from '@youwol/rx-vdom'
import {
    defaultJsSrcSettings,
    defaultTsSrcSettings,
} from './preferences-default-codes'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { ChildApplicationAPI, PlatformState } from './platform.state'

export class PreferencesFacade {
    static forceDefault = false

    static setPreferencesScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        return PreferencesFacade.tryPreferencesScript({ jsSrc }).then(
            (preferences: Preferences) => {
                RequestsExecutor.savePreferencesScript({
                    tsSrc,
                    jsSrc,
                }).subscribe()
                PreferencesFacade.getPreferences$().next(preferences)
            },
        )
    }

    static tryPreferencesScript({ jsSrc }): Promise<Preferences> {
        return new Function(jsSrc)()({
            rxjs,
            cdnClient: webpmClient,
            httpClients,
            fluxView: rxDOM,
            platformState: ChildApplicationAPI.getOsInstance(),
        })
    }

    static getDefaultPreferences() {
        return {
            tsSrc: defaultTsSrcSettings,
            jsSrc: defaultJsSrcSettings,
        }
    }

    static getPreferences$() {
        if (Environment.preferences$) {
            return Environment.preferences$
        }
        Environment.preferences$ = new ReplaySubject<Preferences>(1)

        PreferencesFacade.getPreferencesScript$()
            .pipe(
                mergeMap(({ jsSrc }) =>
                    from(
                        Function(jsSrc)()({
                            rxjs,
                            cdnClient: webpmClient,
                            httpClients,
                            fluxView: rxDOM,
                            platformState: ChildApplicationAPI.getOsInstance(),
                        }),
                    ),
                ),
            )
            .subscribe((preferences: Preferences) => {
                Environment.preferences$.next(preferences)
            })
        return Environment.preferences$
    }

    static getPreferencesScript$() {
        if (PreferencesFacade.forceDefault) {
            return of(PreferencesFacade.getDefaultPreferences())
        }

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
): AnyVirtualDOM[] {
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
    ): AnyVirtualDOM[] {
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
    ): AnyVirtualDOM[] {
        return extractWidgets(preferences.desktop?.widgets, { platformState })
    }

    static getCorporationWidgets(
        preferences: Preferences,
        { platformState }: { platformState: PlatformState },
    ): AnyVirtualDOM[] {
        return extractWidgets(
            preferences.desktop?.topBanner?.corporation?.widgets,
            { platformState },
        )
    }

    static getCorporation(preferences: Preferences): Corporation | undefined {
        return preferences.desktop.topBanner?.corporation
    }
}
