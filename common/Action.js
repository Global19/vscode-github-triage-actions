"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = require("../api/octokit");
const github_1 = require("@actions/github");
const utils_1 = require("./utils");
const core_1 = require("@actions/core");
const appInsights = require("applicationinsights");
let aiHandle = undefined;
const aiKey = core_1.getInput('appInsightsKey');
if (aiKey) {
    appInsights
        .setup(aiKey)
        .setAutoDependencyCorrelation(false)
        .setAutoCollectRequests(false)
        .setAutoCollectPerformance(false, false)
        .setAutoCollectExceptions(false)
        .setAutoCollectDependencies(false)
        .setAutoCollectConsole(false)
        .setUseDiskRetryCaching(false)
        .start();
    aiHandle = appInsights.defaultClient;
}
exports.trackEvent = async (event, props) => {
    if (aiHandle) {
        aiHandle.trackEvent({
            name: event,
            properties: {
                repo: `${github_1.context.repo.owner}/${github_1.context.repo.repo}`,
                workflow: github_1.context.workflow,
                ...props,
            },
        });
    }
};
class Action {
    constructor() {
        this.token = utils_1.getRequiredInput('token');
        this.username = new github_1.GitHub(this.token).users.getAuthenticated().then((v) => v.data.name);
    }
    async trackMetric(telemetry) {
        console.log('tracking metric:', telemetry);
        if (aiHandle) {
            aiHandle.trackMetric({
                ...telemetry,
                properties: {
                    repo: `${github_1.context.repo.owner}/${github_1.context.repo.repo}`,
                    id: this.id,
                    user: await this.username,
                },
            });
        }
    }
    async run() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        console.log('running ', this.id, 'with context', {
            ...github_1.context,
            payload: {
                issue: (_b = (_a = github_1.context.payload) === null || _a === void 0 ? void 0 : _a.issue) === null || _b === void 0 ? void 0 : _b.number,
                label: (_d = (_c = github_1.context.payload) === null || _c === void 0 ? void 0 : _c.label) === null || _d === void 0 ? void 0 : _d.name,
                repository: (_f = (_e = github_1.context.payload) === null || _e === void 0 ? void 0 : _e.repository) === null || _f === void 0 ? void 0 : _f.html_url,
                sender: (_j = (_h = (_g = github_1.context.payload) === null || _g === void 0 ? void 0 : _g.sender) === null || _h === void 0 ? void 0 : _h.login) !== null && _j !== void 0 ? _j : (_l = (_k = github_1.context.payload) === null || _k === void 0 ? void 0 : _k.sender) === null || _l === void 0 ? void 0 : _l.type,
            },
        });
        try {
            const token = utils_1.getRequiredInput('token');
            const readonly = !!core_1.getInput('readonly');
            const issue = (_m = github_1.context === null || github_1.context === void 0 ? void 0 : github_1.context.issue) === null || _m === void 0 ? void 0 : _m.number;
            if (issue) {
                const octokit = new octokit_1.OctoKitIssue(token, github_1.context.repo, { number: issue }, { readonly });
                if (github_1.context.eventName === 'issue_comment') {
                    await this.onCommented(octokit, github_1.context.payload.comment.body, github_1.context.actor);
                }
                else if (github_1.context.eventName === 'issues') {
                    switch (github_1.context.payload.action) {
                        case 'opened':
                            await this.onOpened(octokit);
                            break;
                        case 'reopened':
                            await this.onReopened(octokit);
                            break;
                        case 'closed':
                            await this.onClosed(octokit);
                            break;
                        case 'labeled':
                            await this.onLabeled(octokit, github_1.context.payload.label.name);
                            break;
                        case 'edited':
                            await this.onEdited(octokit);
                            break;
                        case 'milestoned':
                            await this.onMilestoned(octokit);
                            break;
                        default:
                            throw Error('Unexpected action: ' + github_1.context.payload.action);
                    }
                }
            }
            else {
                await this.onTriggered(new octokit_1.OctoKit(token, github_1.context.repo, { readonly }));
            }
        }
        catch (e) {
            await this.error(e);
        }
        await this.trackMetric({ name: 'octokit_request_count', value: octokit_1.getNumRequests() });
        const usage = await utils_1.getRateLimit(this.token);
        await this.trackMetric({ name: 'usage_core', value: usage.core });
        await this.trackMetric({ name: 'usage_graphql', value: usage.graphql });
        await this.trackMetric({ name: 'usage_search', value: usage.search });
    }
    async error(error) {
        const details = {
            message: `${error.message}\n${error.stack}`,
            id: this.id,
            user: await this.username,
        };
        if (github_1.context.issue.number)
            details.issue = github_1.context.issue.number;
        const rendered = `
Message: ${details.message}

Actor: ${details.user}

ID: ${details.id}
`;
        await utils_1.logErrorToIssue(rendered, true, this.token);
        if (aiHandle) {
            aiHandle.trackException({ exception: error });
        }
        core_1.setFailed(error.message);
    }
    async onTriggered(_octokit) {
        throw Error('not implemented');
    }
    async onEdited(_issue) {
        throw Error('not implemented');
    }
    async onLabeled(_issue, _label) {
        throw Error('not implemented');
    }
    async onOpened(_issue) {
        throw Error('not implemented');
    }
    async onReopened(_issue) {
        throw Error('not implemented');
    }
    async onClosed(_issue) {
        throw Error('not implemented');
    }
    async onMilestoned(_issue) {
        throw Error('not implemented');
    }
    async onCommented(_issue, _comment, _actor) {
        throw Error('not implemented');
    }
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map