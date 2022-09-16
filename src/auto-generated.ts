
const runTimeDependencies = {
    "load": {
        "@youwol/cdn-client": "^1.0.2",
        "@youwol/http-clients": "^1.0.2",
        "@youwol/flux-view": "^1.0.3",
        "rxjs": "^6.5.5",
        "uuid": "^8.3.2"
    },
    "differed": {},
    "includedInBundle": []
}
const externals = {
    "@youwol/cdn-client": {
        "commonjs": "@youwol/cdn-client",
        "commonjs2": "@youwol/cdn-client",
        "root": "@youwol/cdn-client_APIv1"
    },
    "@youwol/http-clients": {
        "commonjs": "@youwol/http-clients",
        "commonjs2": "@youwol/http-clients",
        "root": "@youwol/http-clients_APIv1"
    },
    "@youwol/flux-view": {
        "commonjs": "@youwol/flux-view",
        "commonjs2": "@youwol/flux-view",
        "root": "@youwol/flux-view_APIv1"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv6"
    },
    "uuid": {
        "commonjs": "uuid",
        "commonjs2": "uuid",
        "root": "uuid_APIv8"
    },
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv6",
            "operators"
        ]
    }
}
const exportedSymbols = {
    "@youwol/cdn-client": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/cdn-client"
    },
    "@youwol/http-clients": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/http-clients"
    },
    "@youwol/flux-view": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/flux-view"
    },
    "rxjs": {
        "apiKey": "6",
        "exportedSymbol": "rxjs"
    },
    "uuid": {
        "apiKey": "8",
        "exportedSymbol": "uuid"
    }
}
export const setup = {
    name:'@youwol/os-core',
        assetId:'QHlvdXdvbC9vcy1jb3Jl',
    version:'0.1.2-wip',
    shortDescription:"Core part of YouWol's Operating System.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/os-core',
    npmPackage:'https://www.npmjs.com/package/@youwol/os-core',
    sourceGithub:'https://github.com/youwol/os-core',
    userGuide:'https://l.youwol.com/doc/@youwol/os-core',
    apiVersion:'01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    }
}
