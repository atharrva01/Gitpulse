package github

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const graphqlURL = "https://api.github.com/graphql"

type Client struct {
	token  string
	http   *http.Client
}

func New(token string) *Client {
	return &Client{
		token: token,
		http:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) query(ctx context.Context, query string, variables map[string]interface{}, out interface{}) error {
	body := map[string]interface{}{"query": query, "variables": variables}
	b, _ := json.Marshal(body)
	req, _ := http.NewRequestWithContext(ctx, "POST", graphqlURL, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GitHub GraphQL returned %d: %s", resp.StatusCode, string(data))
	}

	var wrapper struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return err
	}
	if len(wrapper.Errors) > 0 {
		return fmt.Errorf("graphql error: %s", wrapper.Errors[0].Message)
	}
	return json.Unmarshal(wrapper.Data, out)
}

type PRNode struct {
	DatabaseID int64     `json:"databaseId"`
	Title      string    `json:"title"`
	Number     int       `json:"number"`
	Additions  int       `json:"additions"`
	Deletions  int       `json:"deletions"`
	HTMLURL    string    `json:"url"`
	CreatedAt  time.Time `json:"createdAt"`
	MergedAt   *time.Time `json:"mergedAt"`
	Reviews    struct {
		TotalCount int `json:"totalCount"`
	} `json:"reviews"`
	Repository struct {
		NameWithOwner string `json:"nameWithOwner"`
		Owner         struct{ Login string `json:"login"` } `json:"owner"`
		Name          string `json:"name"`
	} `json:"repository"`
}

type PRsResult struct {
	PRs      []PRNode
	HasNext  bool
	Cursor   string
}

func (c *Client) FetchMergedPRs(ctx context.Context, login, after string) (*PRsResult, error) {
	const q = `
	query ContributorPRs($login: String!, $after: String) {
		user(login: $login) {
			pullRequests(first: 100, after: $after, states: MERGED,
					orderBy: {field: UPDATED_AT, direction: DESC}) {
				nodes {
					databaseId title number additions deletions url createdAt mergedAt
					reviews(first: 1) { totalCount }
					repository { nameWithOwner owner { login } name }
				}
				pageInfo { hasNextPage endCursor }
			}
		}
	}`

	vars := map[string]interface{}{"login": login}
	if after != "" {
		vars["after"] = after
	}

	var data struct {
		User struct {
			PullRequests struct {
				Nodes    []PRNode `json:"nodes"`
				PageInfo struct {
					HasNextPage bool   `json:"hasNextPage"`
					EndCursor   string `json:"endCursor"`
				} `json:"pageInfo"`
			} `json:"pullRequests"`
		} `json:"user"`
	}
	if err := c.query(ctx, q, vars, &data); err != nil {
		return nil, err
	}
	return &PRsResult{
		PRs:     data.User.PullRequests.Nodes,
		HasNext: data.User.PullRequests.PageInfo.HasNextPage,
		Cursor:  data.User.PullRequests.PageInfo.EndCursor,
	}, nil
}

type ReviewNode struct {
	DatabaseID  int64     `json:"databaseId"`
	State       string    `json:"state"`
	SubmittedAt time.Time `json:"submittedAt"`
	PullRequest struct {
		Number    int        `json:"number"`
		Title     string     `json:"title"`
		CreatedAt time.Time  `json:"createdAt"`
		Repository struct {
			NameWithOwner string `json:"nameWithOwner"`
		} `json:"repository"`
	} `json:"pullRequest"`
}

// FetchCommitDays returns dates (YYYY-MM-DD) where the user had ≥1 GitHub contribution
// in the given time window (max 1 year per call — GitHub API limit).
// Uses contributionCalendar, the same data source as GitHub's green-square graph.
func (c *Client) FetchCommitDays(ctx context.Context, login string, from, to time.Time) ([]string, error) {
	const q = `
	query CommitDays($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				contributionCalendar {
					weeks {
						contributionDays {
							date
							contributionCount
						}
					}
				}
			}
		}
	}`

	vars := map[string]interface{}{
		"login": login,
		"from":  from.UTC().Format(time.RFC3339),
		"to":    to.UTC().Format(time.RFC3339),
	}

	var data struct {
		User struct {
			ContributionsCollection struct {
				ContributionCalendar struct {
					Weeks []struct {
						ContributionDays []struct {
							Date              string `json:"date"`
							ContributionCount int    `json:"contributionCount"`
						} `json:"contributionDays"`
					} `json:"weeks"`
				} `json:"contributionCalendar"`
			} `json:"contributionsCollection"`
		} `json:"user"`
	}
	if err := c.query(ctx, q, vars, &data); err != nil {
		return nil, err
	}

	var days []string
	for _, week := range data.User.ContributionsCollection.ContributionCalendar.Weeks {
		for _, day := range week.ContributionDays {
			if day.ContributionCount > 0 {
				days = append(days, day.Date)
			}
		}
	}
	return days, nil
}

func (c *Client) FetchReviews(ctx context.Context, login, after string) ([]ReviewNode, bool, string, error) {
	const q = `
	query ContributorReviews($login: String!, $after: String) {
		user(login: $login) {
			contributionsCollection {
				pullRequestReviewContributions(first: 100, after: $after) {
					nodes {
						pullRequestReview {
							databaseId state submittedAt
							pullRequest {
								number title createdAt
								repository { nameWithOwner }
							}
						}
					}
					pageInfo { hasNextPage endCursor }
				}
			}
		}
	}`

	vars := map[string]interface{}{"login": login}
	if after != "" {
		vars["after"] = after
	}

	var data struct {
		User struct {
			ContributionsCollection struct {
				PRReviewContributions struct {
					Nodes []struct {
						PullRequestReview ReviewNode `json:"pullRequestReview"`
					} `json:"nodes"`
					PageInfo struct {
						HasNextPage bool   `json:"hasNextPage"`
						EndCursor   string `json:"endCursor"`
					} `json:"pageInfo"`
				} `json:"pullRequestReviewContributions"`
			} `json:"contributionsCollection"`
		} `json:"user"`
	}
	if err := c.query(ctx, q, vars, &data); err != nil {
		return nil, false, "", err
	}

	nodes := data.User.ContributionsCollection.PRReviewContributions.Nodes
	reviews := make([]ReviewNode, 0, len(nodes))
	for _, n := range nodes {
		reviews = append(reviews, n.PullRequestReview)
	}
	pi := data.User.ContributionsCollection.PRReviewContributions.PageInfo
	return reviews, pi.HasNextPage, pi.EndCursor, nil
}
