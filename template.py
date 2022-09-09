from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, generate_template

template = Template(
    path=Path(__file__).parent,
    type=PackageType.Library,
    name="@youwol/os-core",
    version="0.0.6-wip",
    shortDescription="Core part of YouWol's Operating System.",
    author="greinisch@youwol.com",
    dependencies=Dependencies(
        runTime=RunTimeDeps(
            load={
                "@youwol/cdn-client": "^0.1.3",
                "@youwol/http-clients": "^0.1.9",
                "@youwol/flux-view": "^0.1.1",
                "rxjs": "^6.5.5",
                "uuid": "^8.3.2"
            }
        ),
        devTime={
        }
    ),
    userGuide=True
    )

generate_template(template)
