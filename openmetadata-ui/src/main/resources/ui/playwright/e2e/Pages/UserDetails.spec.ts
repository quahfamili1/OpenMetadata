/*
 *  Copyright 2024 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { expect, Page, test as base } from '@playwright/test';
import { TeamClass } from '../../support/team/TeamClass';
import { AdminClass } from '../../support/user/AdminClass';
import { UserClass } from '../../support/user/UserClass';
import { performAdminLogin } from '../../utils/admin';
import { uuid } from '../../utils/common';
import { redirectToUserPage } from '../../utils/userDetails';

const user1 = new UserClass();
const user2 = new UserClass();
const admin = new AdminClass();
const team = new TeamClass({
  name: `a-new-team-${uuid()}`,
  displayName: `A New Team ${uuid()}`,
  description: 'playwright team description',
  teamType: 'Group',
});

// Create 2 page and authenticate 1 with admin and another with normal user
const test = base.extend<{
  adminPage: Page;
  userPage: Page;
}>({
  adminPage: async ({ browser }, use) => {
    const page = await browser.newPage();
    await admin.login(page);
    await use(page);
    await page.close();
  },
  userPage: async ({ browser }, use) => {
    const page = await browser.newPage();
    await user1.login(page);
    await use(page);
    await page.close();
  },
});

test.describe('User with different Roles', () => {
  test.beforeAll('Setup pre-requests', async ({ browser }) => {
    const { afterAction, apiContext } = await performAdminLogin(browser);

    await user1.create(apiContext);
    await user2.create(apiContext);

    await team.create(apiContext);

    await afterAction();
  });

  test.afterAll(async ({ browser }) => {
    const { afterAction, apiContext } = await performAdminLogin(browser);

    await user1.delete(apiContext);
    await user2.delete(apiContext);

    await team.delete(apiContext);

    await afterAction();
  });

  test('Admin user can get all the teams hierarchy and edit teams', async ({
    adminPage,
  }) => {
    await redirectToUserPage(adminPage);

    // Check if the avatar is visible
    await expect(adminPage.getByTestId('user-profile-teams')).toBeVisible();

    await adminPage.getByTestId('edit-teams-button').click();

    await expect(adminPage.getByTestId('team-select')).toBeVisible();

    await adminPage.getByTestId('team-select').click();

    await adminPage.waitForSelector('.ant-tree-select-dropdown', {
      state: 'visible',
    });

    await adminPage.getByText('Accounting').click();

    await adminPage.getByTestId('teams-edit-save-btn').click();

    await expect(adminPage.getByTestId('user-profile-teams')).toContainText(
      'Accounting'
    );
  });

  test('Admin user can get all the roles hierarchy and edit roles', async ({
    adminPage,
  }) => {
    await redirectToUserPage(adminPage);

    await expect(adminPage.getByTestId('user-profile-roles')).toBeVisible();

    await adminPage.getByTestId('edit-roles-button').click();

    await expect(
      adminPage.getByTestId('profile-edit-roles-select')
    ).toBeVisible();

    await adminPage.getByTestId('profile-edit-roles-select').click();

    await adminPage.waitForSelector('.ant-select-dropdown', {
      state: 'visible',
    });

    await adminPage.getByText('Application bot role').click();

    await adminPage.getByTestId('user-profile-edit-roles-save-button').click();

    await expect(adminPage.getByTestId('user-profile-roles')).toContainText(
      'Application bot role'
    );
  });

  test('Non admin user should be able to edit display name and description on own profile', async ({
    userPage,
  }) => {
    await redirectToUserPage(userPage);

    // Check if the display name is present
    await expect(userPage.getByTestId('user-display-name')).toHaveText(
      user1.responseData.displayName
    );

    await userPage.click('[data-testid="user-profile-manage-btn"]');
    await userPage.click('[data-testid="edit-displayname"]');
    await userPage.waitForSelector('[role="dialog"].ant-modal', {
      state: 'visible',
    });
    await userPage.fill('[data-testid="displayName"]', 'New Display Name');
    await userPage.click('[data-testid="save-display-name"]');

    await expect(userPage.getByTestId('user-display-name')).toHaveText(
      'New Display Name'
    );
  });

  test('Non admin user should not be able to edit the persona or roles', async ({
    userPage,
  }) => {
    await redirectToUserPage(userPage);

    await expect(userPage.getByTestId('persona-details-card')).toBeVisible();
    await expect(
      userPage.getByTestId('edit-user-persona').getByTestId('edit-persona')
    ).not.toBeVisible();
    await expect(userPage.getByTestId('user-profile-roles')).toBeVisible();
    // Edit Roles icon shouldn't be visible
    await expect(
      userPage.getByTestId('user-profile-edit-roles-save-button')
    ).not.toBeVisible();
  });
});
