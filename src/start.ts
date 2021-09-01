import { parseTscOutput, readDirRecursiveToStrArray, TscLog } from "ystd_server";
import { sync as execaSync } from "execa";
import { join } from "path";
import { readFileSync, writeFileSync, outputFileSync } from "fs-extra";

export interface ReplaceDefinition {
    from: string;
    to: string;
}
export interface ReplacesDefinition {
    replaces: ReplaceDefinition[];
}

const missingDependencies1: ReplacesDefinition = {
    replaces: [
        { from: '"Ystd"', to: '"ystd"' },
        { from: '"HastyTBD"', to: '"@yuyaryshev/yhasty2"' },
        { from: '"YtransportClientWithAuth"', to: '"@yuyaryshev/ytransport_client_with_auth"' },
        { from: '"YtransportCommon"', to: '"@yuyaryshev/ytransport_common"' },
        { from: '"YtransportAuthCommon"', to: '"@yuyaryshev/ytransport_auth_common"' },
        { from: '"YtransportClient"', to: '"@yuyaryshev/ytransport_client"' },
        { from: '"YtransportHasty2Common"', to: '"@yuyaryshev/ytransport_hasty2_common"' },
        { from: '"YtransportServer"', to: '"@yuyaryshev/ytransport_server"' },
        { from: '"YtransportObservable"', to: '"@yuyaryshev/ytransport_observable"' },
        { from: '"YtransportCallback"', to: '"@yuyaryshev/ytransport_callback"' },
        { from: '"YDomainRuntimeCommon"', to: '"@yuyaryshev/ydomain_runtime_common"' },
        { from: '"YtransportHasty2Client"', to: '"@yuyaryshev/ytransport_hasty2_client"' },
        { from: '"YDomainRuntimeClient"', to: '"@yuyaryshev/ydomain_runtime_client"' },
        { from: '"YDomainRuntimeServer"', to: '"@yuyaryshev/ydomain_runtime_server"' },
        { from: '"YtransportServerWithAuth"', to: '"@yuyaryshev/ytransport_server_with_auth"' },
        { from: '"ystd"', to: '"ystd"' },
        { from: '"Yobservable"', to: '"@yuyaryshev/yobservable"' },
        { from: '"Yintervals"', to: '"@yuyaryshev/yintervals"' },
        { from: '"Ydb"', to: '"@yuyaryshev/ydb"' },
        { from: '"YdbStub"', to: '"@yuyaryshev/ydb_stub"' },
        { from: '"XQueryCore"', to: '"@yuyaryshev/yquery_core"' },
        { from: '"YstdServer"', to: '"ystd_server"' },
        { from: '"YtransportHasty2Server"', to: '"@yuyaryshev/ytransport_hasty2_server"' },

        // "codemirror":"codemirror",
        // "debug":"debug",
        // "mobx":"mobx",
        // "@mojotech/json-type-validation":"@mojotech/json-type-validation",
    ],
};

const tsExts: string[] = "ts,tsx,cjs,js,mjs,jsx".split(",");

async function main() {
    const { globby } = await import("globby");
    const basePath = `D:\\b\\Mine\\GIT_Work`;
    const projects = ["yhasty2_tests"]; //,"app_dc_test"]; //"ytransport_callback", "ytransport_observable", "yintervals", "yquery_core", "yhasty2"]; // "app_ide", "ytransport_hasty2_common", "ytransport_hasty2_client", "ytransport_hasty2_server", "app_dc_test", "yhasty2"];
    const missingDependencies = new Set<string>();

    function runCmdSync(cmd: string) {
        const escapedCmd = cmd.replaceAll('"', '""');
        return execaSync(`cmd /c "${escapedCmd}"`);
    }

    function getProjectFullPath(projectName: string) {
        return join(basePath, projectName);
    }

    async function getProjectTscLog(projectName: string): Promise<TscLog> {
        const projectFullPath = getProjectFullPath(projectName);
        const cmd1 = `cd ${projectFullPath} && tsc --pretty true`;
        const { stdout, stderr } = execaSync(cmd1, { shell: true, reject: false, all: true });
        const tscLog = parseTscOutput(stdout);
        return tscLog;
    }

    async function replaceInSrc(projectName: string, replacesDefinition: ReplacesDefinition): Promise<void> {
        const projectFullPath = getProjectFullPath(projectName);
        const glob = join(projectFullPath, "src", "**/*.{ts,tsx,cjs,js,mjs,jsx}");
        const paths = readDirRecursiveToStrArray(join(projectFullPath, "src"), { removeDirectories: true, allowedExts: tsExts });

        for (const filePath of paths) {
            const oldContentStr = readFileSync(filePath, "utf-8");
            let newContentStr = oldContentStr;

            for (const replaceItem of replacesDefinition.replaces) {
                newContentStr = newContentStr.replaceAll(replaceItem.from, replaceItem.to);
            }

            if (newContentStr !== oldContentStr) {
                writeFileSync(filePath, newContentStr, "utf-8");
            }
        }
    }

    async function gatherMissingDeps() {
        for (const projectName of projects) {
            const tscLog = await getProjectTscLog(projectName);
            for (const d of Object.keys(tscLog.missingDependencies)) {
                missingDependencies.add(d);
            }
        }
    }

    async function replaceDeps() {
        for (const projectName of projects) {
            await replaceInSrc(projectName, missingDependencies1);
        }
    }

    async function printMissingModules() {
        const s = `const missingDependencies: ReplacesDefinition = { replaces:[\n${[...missingDependencies]
            .map((s) => `{from:'"${s}"',to:'"${s}"'},`)
            .join("\n")}\n]};        
        `;
        console.log(s);

        const pnpmScript = `pnpm i ${[...missingDependencies].map((s) => `${s}@*`).join(" ")} && pnpm i && republish`;
        console.log(pnpmScript);
    }

    await gatherMissingDeps();
    await replaceDeps();
    await printMissingModules();
}

main();
