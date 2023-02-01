/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// test contains the stubs required for counterfeiter to generate the mocks used for tests
//
// The mocks are created by running `go generate ./...` as described in the counterfeiter readme
package testutils_test

import (
	"os"
	"testing"

	log "github.com/sirupsen/logrus"
)

func TestMain(m *testing.M) {
	log.SetLevel(log.PanicLevel)
	log.SetOutput(os.Stdout)
	os.Exit(m.Run())
}
