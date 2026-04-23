CREATE TABLE IF NOT EXISTS watched_repos (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_full_name VARCHAR(511) NOT NULL,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, repo_full_name)
);

CREATE INDEX idx_watched_repos_user ON watched_repos(user_id);

CREATE TABLE IF NOT EXISTS repo_contributors (
    id              BIGSERIAL PRIMARY KEY,
    watched_repo_id BIGINT NOT NULL REFERENCES watched_repos(id) ON DELETE CASCADE,
    login           VARCHAR(255) NOT NULL,
    avatar_url      TEXT NOT NULL DEFAULT '',
    pr_count_30d    INT NOT NULL DEFAULT 0,
    pr_count_90d    INT NOT NULL DEFAULT 0,
    last_pr_at      TIMESTAMPTZ,
    first_pr_at     TIMESTAMPTZ,
    is_stale        BOOLEAN NOT NULL DEFAULT false,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(watched_repo_id, login)
);

CREATE INDEX idx_repo_contributors_repo ON repo_contributors(watched_repo_id);

CREATE TABLE IF NOT EXISTS stale_prs (
    id              BIGSERIAL PRIMARY KEY,
    watched_repo_id BIGINT NOT NULL REFERENCES watched_repos(id) ON DELETE CASCADE,
    github_pr_id    BIGINT NOT NULL,
    number          INT NOT NULL,
    title           TEXT NOT NULL DEFAULT '',
    author_login    VARCHAR(255) NOT NULL DEFAULT '',
    html_url        TEXT NOT NULL DEFAULT '',
    opened_at       TIMESTAMPTZ NOT NULL,
    days_open       INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(watched_repo_id, github_pr_id)
);
