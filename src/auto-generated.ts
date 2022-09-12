
const runTimeDependencies = {
    "load": {
        "@youwol/cdn-client": "^1.0.0",
        "@youwol/http-clients": "^1.0.0",
        "@youwol/flux-view": "^1.0.0",
        "rxjs": "^6.5.5",
        "uuid": "^8.3.2"
    },
    "differed": {},
    "includedInBundle": []
}
const externals = {
    "@youwol/cdn-client": "@youwol/cdn-client_APIv1",
    "@youwol/http-clients": "@youwol/http-clients_APIv1",
    "@youwol/flux-view": "@youwol/flux-view_APIv1",
    "rxjs": "rxjs_APIv6",
    "uuid": "uuid_APIv8",
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv6",
            "operators"
        ]
    }
}
export const setup = {
    name:'@youwol/os-core',
    assetId:'QHlvdXdvbC9vcy1jb3Jl',
    version:'0.1.0',
    shortDescription:"Core part of YouWol's Operating System.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/os-core',
    npmPackage:'https://www.npmjs.com/package/@youwol/os-core',
    sourceGithub:'https://github.com/youwol/os-core',
    userGuide:'https://l.youwol.com/doc/@youwol/os-core',
    apiVersion:'01',
    runTimeDependencies,
    externals
}
