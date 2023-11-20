import {
    VirtualDOM,
    RxHTMLElement,
    AnyVirtualDOM,
    ChildrenLike,
} from '@youwol/rx-vdom'
import { Observable, ReplaySubject } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { AssetsGateway } from '@youwol/http-clients'
import { raiseHTTPErrors } from '@youwol/http-primitives'
import { PlatformState } from './platform.state'
import { ApplicationInfo } from './environment'

class IframeAppView implements VirtualDOM<'iframe'> {
    public readonly tag = 'iframe'
    public readonly width = '100%'
    public readonly height = '100%'
    public readonly src: string
    connectedCallback: (HTMLElement$) => void

    constructor(src: string, iframe$: ReplaySubject<HTMLIFrameElement>) {
        this.src = src
        this.connectedCallback = (elem: RxHTMLElement<'iframe'>) => {
            iframe$.next(elem)
        }
    }
}
export interface Executable {
    cdnPackage: string
    version: string
    parameters: { [key: string]: string }
    appMetadata$: Observable<ApplicationInfo>
}

export class RunningApp implements Executable {
    public readonly state: PlatformState

    public readonly cdnPackage: string
    public readonly version: string
    public readonly url: string
    public readonly parameters: { [key: string]: string }
    public readonly appMetadata$ = new ReplaySubject<ApplicationInfo>(1)

    public readonly instanceId: string

    public readonly iframe$ = new ReplaySubject<HTMLIFrameElement>()

    public readonly view: AnyVirtualDOM

    public readonly topBannerActions$ = new ReplaySubject<AnyVirtualDOM>(1)
    public readonly topBannerUserMenu$ = new ReplaySubject<AnyVirtualDOM>(1)
    public readonly topBannerYouwolMenu$ = new ReplaySubject<AnyVirtualDOM>(1)

    public readonly header$ = new ReplaySubject<AnyVirtualDOM>(1)
    public readonly snippet$ = new ReplaySubject<AnyVirtualDOM>(1)

    htmlElement: HTMLElement

    constructor(params: {
        state: PlatformState
        cdnPackage: string
        instanceId?: string
        version: string
        metadata?: { name: string; icon: AnyVirtualDOM }
        title?: string
        parameters?: { [key: string]: string }
    }) {
        Object.assign(this, params)
        new AssetsGateway.Client().cdn
            .getResource$<ApplicationInfo>({
                libraryId: window.btoa(this.cdnPackage),
                version: 'latest',
                restOfPath: '.yw_metadata.json',
            })
            .pipe(raiseHTTPErrors())
            .subscribe((appInfo) => {
                this.appMetadata$.next(appInfo)
                this.snippet$.next({
                    tag: 'div',
                    innerText: appInfo.displayName,
                })
                this.header$.next(
                    new HeaderView({
                        snippet$: this.snippet$,
                    }),
                )
            })

        this.version = this.version || 'latest'
        this.instanceId = this.instanceId || uuidv4()
        this.parameters = this.parameters || {}
        const queryParams = Object.entries(this.parameters).reduce(
            (acc, [k, v]) => `${acc}&${k}=${v}`,
            '',
        )
        this.url = `/applications/${this.cdnPackage}/${this.version}?instance-id=${this.instanceId}${queryParams}`

        this.view = this.createView()
    }

    setSnippet(snippet: AnyVirtualDOM) {
        this.snippet$.next(snippet)
    }

    terminateInstance() {
        this.htmlElement.remove()
    }

    createView() {
        return {
            tag: 'div' as const,
            class: {
                source$: this.state.runningApplication$,
                vdomMap: (app) =>
                    app && app.instanceId == this.instanceId
                        ? 'h-100 w-100 d-flex'
                        : 'd-none',
            },
            children: [new IframeAppView(this.url, this.iframe$)],
            connectedCallback: (elem: HTMLElement) => {
                this.htmlElement = elem
            },
        }
    }
}

class HeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'px-1 d-flex flex-column'
    public readonly innerText: string
    public readonly title: string
    public readonly children: ChildrenLike
    constructor(params: { snippet$: Observable<AnyVirtualDOM> }) {
        Object.assign(this, params)
        this.children = [
            {
                source$: params.snippet$,
                vdomMap: (snippet: AnyVirtualDOM) => snippet,
            },
        ]
    }
}
