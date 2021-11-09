export default class Config {
    constructor() {
        this._organization = ''
        this._repository = ''
        this._sprints = []
        this._teams = []
        this._team_index = null
        this._github_access_token = ''
    }

    static from_storage() {
        const string = localStorage.getItem('config')
        if (!string) {
            return new Config()
        }

        return Config.from_json(JSON.parse(string))
    }

    static from_file(file, callback = () => {}) {
        if (file) {
            const config_reader = new FileReader()

            config_reader.onload = (event) => {
                const content = event.target.result.toString()
                callback(Config.from_json(JSON.parse(content)))
            }

            config_reader.readAsText(file)
        } else {
            callback(new Config())
        }
    }

    static from_json(json) {
        const instance = new Config()

        instance.organization = json.organization
        instance.repository = json.repository
        instance.teams = json.teams
        instance.team_index = json.team_index
        instance.github_access_token = json.github_access_token

        if (json.sprints && json.sprints.length !== 0) {
            json.sprints.forEach((sprint) => {
                const from = new Date(Date.parse(sprint.from))
                const to = new Date(Date.parse(sprint.to))
                instance.sprints.push({
                    from: from,
                    to: to
                })
            })
        }

        return instance
    }

    to_storage() {
        localStorage.setItem('config', this.toString())
    }

    get organization() {
        return this._organization
    }

    set organization(value) {
        this._organization = value
    }

    get repository() {
        return this._repository
    }

    set repository(value) {
        this._repository = value
    }

    get sprints() {
        return this._sprints
    }

    set sprints(value) {
        this._sprints = value
    }

    get teams() {
        return this._teams
    }

    set teams(value) {
        this._teams = value
    }

    get team_index() {
        return this._team_index
    }

    set team_index(value) {
        this._team_index = value
    }

    get github_access_token() {
        return this._github_access_token
    }

    set github_access_token(value) {
        this._github_access_token = value
    }

    toString() {
        return JSON.stringify({
            organization: this.organization,
            repository: this.repository,
            sprints: this.sprints,
            teams: this.teams,
            team_index: this.team_index,
            github_access_token: this.github_access_token
        })
    }

    equals(other) {
        const property_names = Object.getOwnPropertyNames(this)
        for (let i = 0; i < property_names.length; i++) {
            const property = property_names[i]
            if (JSON.stringify(this[property]) !== JSON.stringify(other[property])) return false
        }

        return true
    }
}
