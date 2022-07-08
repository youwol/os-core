// ---------------------------------------------------------------------------------------------
// ----------------- Youwol SVG icon -----------------------------------------------------------
// ---------------------------------------------------------------------------------------------

const bgYouWol = `
<svg xmlns="http://www.w3.org/2000/svg" width="100vw" height="100vh" viewBox="-700 -600 2000 1920" preserveAspectRatio="xMidYMid slice">
\t<style>body{margin:0; padding:0;}</style>
\t<defs><filter id="blur"><feGaussianBlur stdDeviation="0" /></filter></defs>
\t<g id="logo" fill="#E5CD98" filter="url(#blur)">
\t\t<polygon class="cls-1" points="592.23 511.85 592.23 454.94 494.04 398.24 592.24 341.55 592.24 227.72 345.82 370 345.8 370.01 345.8 654.52 444.37 597.6 444.37 483.4 543.32 540.52 592.23 512.29 592.23 511.85"/>
\t\t<polygon class="cls-1" points="296.42 285.12 50.01 142.85 148.57 85.94 246.78 142.63 246.78 29.25 296.06 0.8 296.45 0.58 345.36 28.81 345.36 143.07 444.26 85.97 542.84 142.88 296.44 285.13 296.42 285.12"/>
\t\t<polygon class="cls-1" points="0.88 512.05 50.17 540.51 148.36 483.82 148.36 597.63 246.94 654.53 246.94 370 246.94 369.97 0.55 227.71 0.55 341.54 99.46 398.23 0.5 455.36 0.5 511.83 0.88 512.05"/>\t
\t</g>
\t<defs><linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%"><stop style="stop-color: #42210B;" offset="0" stop-opacity="0.9"/><stop style="stop-color: #C7B299;" offset="1" stop-opacity="0.9"/></linearGradient></defs>
\t<rect style="fill: url(#g);" x="-700" y="-600" width="2000" height="1920"/>
</svg>`

// ---------------------------------------------------------------------------------------------
// ----------------- Common javascript/typescript of preferences -------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultPreferencesContent = `
    const bgViewDefault = {
        class: "h-100 w-100",
        style:{
            backgroundColor: "#ffffff"
        },
        innerHTML: youwolSvgIcon
    }
    const topBannerViewDefault = {
        class:'text-center',
        innerText: fluxView.attr$(
            rxjs.timer(0,1000),
            () => new Date().toLocaleString()
        )
    }
    const {ywInstall} = await cdnClient.install({
        modules:['@youwol/installers-youwol'],
        aliases:{'ywInstall':'@youwol/installers-youwol'}
    })
    return {
        cssTheme: 'not used for now',
        profile:{
            avatar:{
                class:'fas fa-user fa-2x'
            }
        },
        desktop:{
            backgroundView: bgViewDefault,            
            topBannerView: topBannerViewDefault,
            widgets:[
                new ywInstall.basic.DesktopFavoritesView({class:'d-flex flex-wrap'})
            ]
        }
    }`
// ---------------------------------------------------------------------------------------------
// ----------------- Default typescript of preferences -----------------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultTsSrcSettings = `
import {Preferences} from './environment'

async function preferences({fluxView, cdnClient, httpClients, rxjs}) : Promise<Preferences> {
    ${defaultPreferencesContent}
}

const youwolSvgIcon = \`${bgYouWol}\`

return preferences
`

// ---------------------------------------------------------------------------------------------
// ----------------- Default javascript of preferences -----------------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultJsSrcSettings = `
async function preferences({fluxView, cdnClient, httpClients, rxjs}){
    ${defaultPreferencesContent}
}

const youwolSvgIcon = \`${bgYouWol}\`

return preferences
`
