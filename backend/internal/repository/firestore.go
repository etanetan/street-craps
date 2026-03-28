package repository

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

// NewFirestoreClient creates a Firestore client.
// projectID is the GCP project ID.
// credentialsFile is optional; if empty, Application Default Credentials are used.
func NewFirestoreClient(ctx context.Context, projectID, credentialsFile string) (*firestore.Client, error) {
	var app *firebase.App
	var err error

	conf := &firebase.Config{ProjectID: projectID}
	if credentialsFile != "" {
		app, err = firebase.NewApp(ctx, conf, option.WithCredentialsFile(credentialsFile))
	} else {
		app, err = firebase.NewApp(ctx, conf)
	}
	if err != nil {
		return nil, fmt.Errorf("firebase.NewApp: %w", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("app.Firestore: %w", err)
	}
	return client, nil
}
