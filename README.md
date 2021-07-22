# RepositoryGuide

## Installation

1. Clone the repository: ```git@github.com:hpi-epic/repositoryguide.git``` and go into the repository folder
2. Make sure you've installed node. If not download and install it from [here](https://nodejs.org/en/download/)
3. Run `npm install` in the root of the repository
4. generate a personal access token for GitHub [https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)
5. Open the project on a local server. We used the local development server that WebStorm offers for that. Just opening the index.html in a Browser as is won't work
6. Download the config to have an empty version of a config.json file. Replace ```"github_access_token": ""``` with ```"github_access_token": "<your token>"```
7. Load the edited config into the application.
8. The preparations are now done. Enjoy your metrics. :-)

## Codestyle
To follow the codestyle used in this prototype you need Prettier and Eslint. After having setup the project you need to setup these tools. For Webstorm follow the following tutorials:
- ESLint
    - Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/eslint.html)
        - [Before you start](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_linters_eslint_before_you_start) 1&2
        - [Configure ESLint automatically](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_eslint_automatic_configuration)
        - [Recommended to run ESLint on save](https://www.jetbrains.com/help/webstorm/eslint.html#ws_eslint_configure_run_eslint_on_save)
- Prettier
    - Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/prettier.html)
        - [Before you start](https://www.jetbrains.com/help/webstorm/prettier.html#prettier_before_you_start) 1,2 and 3 
        - [Configure PRettier 2,3, & 4](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_install)
        - [Recommended to run Prettier on save](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_run_automatically_in_current_project)
