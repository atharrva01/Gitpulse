package github

import (
	"context"
	"time"
)

type OpenPRNode struct {
	DatabaseID int64     `json:"databaseId"`
	Number     int       `json:"number"`
	Title      string    `json:"title"`
	HTMLURL    string    `json:"url"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Author     struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatarUrl"`
	} `json:"author"`
}

func (c *Client) FetchOpenPRs(ctx context.Context, owner, name, after string) ([]OpenPRNode, bool, string, error) {
	const q = `
	query RepoOpenPRs($owner: String!, $name: String!, $after: String) {
		repository(owner: $owner, name: $name) {
			pullRequests(first: 100, after: $after, states: OPEN,
					orderBy: {field: CREATED_AT, direction: ASC}) {
				nodes {
					databaseId number title url createdAt updatedAt
					author { login avatarUrl }
				}
				pageInfo { hasNextPage endCursor }
			}
		}
	}`

	vars := map[string]interface{}{"owner": owner, "name": name}
	if after != "" {
		vars["after"] = after
	}

	var data struct {
		Repository struct {
			PullRequests struct {
				Nodes    []OpenPRNode `json:"nodes"`
				PageInfo struct {
					HasNextPage bool   `json:"hasNextPage"`
					EndCursor   string `json:"endCursor"`
				} `json:"pageInfo"`
			} `json:"pullRequests"`
		} `json:"repository"`
	}
	if err := c.query(ctx, q, vars, &data); err != nil {
		return nil, false, "", err
	}
	pi := data.Repository.PullRequests.PageInfo
	return data.Repository.PullRequests.Nodes, pi.HasNextPage, pi.EndCursor, nil
}

type MergedPRContrib struct {
	MergedAt time.Time
	Author   struct {
		Login     string
		AvatarURL string
	}
}

func (c *Client) FetchRecentMergedPRs(ctx context.Context, owner, name string) ([]MergedPRContrib, error) {
	const q = `
	query RepoMergedPRs($owner: String!, $name: String!) {
		repository(owner: $owner, name: $name) {
			pullRequests(first: 100, states: MERGED,
					orderBy: {field: UPDATED_AT, direction: DESC}) {
				nodes {
					mergedAt
					author { login avatarUrl }
				}
			}
		}
	}`

	vars := map[string]interface{}{"owner": owner, "name": name}

	var data struct {
		Repository struct {
			PullRequests struct {
				Nodes []struct {
					MergedAt time.Time `json:"mergedAt"`
					Author   struct {
						Login     string `json:"login"`
						AvatarURL string `json:"avatarUrl"`
					} `json:"author"`
				} `json:"nodes"`
			} `json:"pullRequests"`
		} `json:"repository"`
	}
	if err := c.query(ctx, q, vars, &data); err != nil {
		return nil, err
	}

	result := make([]MergedPRContrib, len(data.Repository.PullRequests.Nodes))
	for i, n := range data.Repository.PullRequests.Nodes {
		result[i] = MergedPRContrib{MergedAt: n.MergedAt}
		result[i].Author.Login = n.Author.Login
		result[i].Author.AvatarURL = n.Author.AvatarURL
	}
	return result, nil
}
