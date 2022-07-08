import { RequestsExecutor } from './requests-executor'

import { getEnvironmentSingleton, Preferences } from './environment'
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

export class PreferencesFacade {
    static setPreferencesScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        RequestsExecutor.savePreferencesScript({ tsSrc, jsSrc }).subscribe()
        new Function(jsSrc)()({ rxjs, cdnClient, httpClients, fluxView }).then(
            (preferences: Preferences) => {
                PreferencesFacade.getPreferences$().next(preferences)
            },
        )
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
