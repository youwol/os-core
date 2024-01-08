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

const ywLogo = `
<svg id='logo2bis' xmlns='http://www.w3.org/2000/svg' style='margin: auto' viewBox='0 0 109.58 121.1' width='25px' height='25px'>
<defs><style>.cls-2{fill:white;}</style></defs>
<title>logo_YouWol_white</title>
<polygon class='cls-2' points='109.58 94.68 109.58 84.14 91.39 73.64 109.58 63.14 109.58 42.06 63.95 68.41 63.94 68.41 63.94 121.1 82.2 110.56 82.2 89.41 100.52 99.99 109.58 94.76 109.58 94.68'/>
<polygon class='cls-2' points='54.8 52.69 9.17 26.35 27.42 15.81 45.61 26.31 45.61 5.31 54.73 0.04 54.8 0 63.86 5.23 63.86 26.39 82.18 15.81 100.43 26.35 54.8 52.7 54.8 52.69'/>
<polygon class='cls-2' points='0.07 94.72 9.2 99.99 27.38 89.49 27.38 110.56 45.64 121.1 45.64 68.41 45.64 68.41 0.01 42.06 0.01 63.14 18.33 73.64 0 84.22 0 94.68 0.07 94.72'/>
</svg>
`
// ---------------------------------------------------------------------------------------------
// ----------------- Common javascript/typescript of preferences -------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultPreferencesContent = `
    const { osWidgets, rxjs} = await webpmClient.install({
        modules:['@youwol/os-widgets#^0.2.1 as osWidgets' , 'rxjs#^7.5.6 as rxjs' ],
    })

    const favorites = await osWidgets.favoritesWidget()
    return {
        cssTheme: 'coming soon',
        desktop:{
            // This defines the background
            backgroundView: {
                tag:'div',
                class: "h-100 w-100",
                style:{
                    backgroundColor: "#ffffff"
                },
                innerHTML: youwolSvgIcon
            }, 
            // This defines the top banner
            topBanner: { 
                // Left side icon & associated widgets
                corporation: {
                    icon: { 
                        class:'h-100  d-flex flex-column justify-content-center',
                        innerHTML: youwolLogo 
                    },
                    widgets:[{
                    class:'text-center my-auto',
                    innerText: {
                            source$: rxjs.timer(0,1000),
                            vdomMap: () => new Date().toLocaleString()
                        }
                }]
                },
                // Custom widgets of the top-banner, here a timer displaying the current date
                widgets: [{
                    class:'text-center my-auto',
                    innerText: {
                            source$: rxjs.timer(0,1000),
                            vdomMap: () => new Date().toLocaleString()
                        }
                }],
            },           
            // Desktop's widgets
            widgets:[
                favorites
            ]
        }
    }`
// ---------------------------------------------------------------------------------------------
// ----------------- Default typescript of preferences -----------------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultTsSrcSettings = `
import {Preferences} from './environment'

async function preferences({ webpmClient, httpClients,  platformState}) : Promise<Preferences> {
    ${defaultPreferencesContent}
}

const youwolSvgIcon = \`${bgYouWol}\`
const youwolLogo = \`${ywLogo}\`
return preferences
`

// ---------------------------------------------------------------------------------------------
// ----------------- Default javascript of preferences -----------------------------------------
// ---------------------------------------------------------------------------------------------

export const defaultJsSrcSettings = `
async function preferences({webpmClient,  httpClients, platformState}){
    ${defaultPreferencesContent}
}

const youwolSvgIcon = \`${bgYouWol}\`
const youwolLogo = \`${ywLogo}\`

return preferences
`
