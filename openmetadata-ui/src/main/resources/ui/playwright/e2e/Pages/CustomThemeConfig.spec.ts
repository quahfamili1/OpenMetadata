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
import test, { expect } from '@playwright/test';
import { GlobalSettingOptions } from '../../constant/settings';
import { redirectToHomePage } from '../../utils/common';
import { settingClick } from '../../utils/sidebar';

const config = {
  logo: 'https://custom-logo.png',
  monogram: 'https://custom-monogram.png',
  logoError: 'Logo URL is not valid url',
  monogramError: 'Monogram URL is not valid url',
};

const themeConfig = {
  primaryColor: '#6809dc',
  infoColor: '#2196f3',
  successColor: '#008376',
  warningColor: '#ffc34e',
  errorColor: '#ff4c3b',
};

// use the admin user to login
test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Custom Theme Config Page', () => {
  test.beforeEach('Visit Home Page', async ({ page }) => {
    await redirectToHomePage(page);
    await settingClick(page, GlobalSettingOptions.APPEARANCE);
  });

  test('Update and reset custom theme config', async ({ page }) => {
    // type 'incorrect url' for customLogoUrlPath
    await page
      .locator('[data-testid="customLogoUrlPath"]')
      .fill('incorrect url');

    // Check for validation error
    await page.getByText(config.logoError).isVisible();

    // Clear and type the correct logo URL
    await page.locator('[data-testid="customLogoUrlPath"]').fill(config.logo);

    // type 'incorrect url' for customMonogramUrlPath
    await page
      .locator('[data-testid="customMonogramUrlPath"]')
      .fill('incorrect url');

    // Check for validation error
    await page.getByText(config.monogramError).isVisible();

    // Clear and type the correct monogram URL
    await page
      .locator('[data-testid="customMonogramUrlPath"]')
      .fill(config.monogram);

    // Theme config
    for (const colorType of Object.keys(themeConfig)) {
      await page
        .locator(`[data-testid="${colorType}-color-input"]`)
        .fill(themeConfig[colorType as keyof typeof themeConfig]);
    }

    const updatedConfigResponsePromise = page.waitForResponse(
      '/api/v1/system/settings'
    );

    // Click the save button
    await page.locator('[data-testid="save-btn"]').click();

    const updatedConfigResponse = await updatedConfigResponsePromise;

    // Verify the response status code
    expect(updatedConfigResponse.status()).toBe(200);

    // Verify the updated theme color
    await expect(page.getByTestId('save-btn')).toHaveCSS(
      'background-color',
      'rgb(21, 112, 239)'
    );

    const defaultConfigResponsePromise = page.waitForResponse(
      '/api/v1/system/settings'
    );

    // Click the reset button
    await page.locator('[data-testid="reset-button"]').click();

    const defaultConfigResponse = await defaultConfigResponsePromise;

    // Verify the response status code
    expect(defaultConfigResponse.status()).toBe(200);

    // Verify the default theme color
    await expect(page.getByTestId('reset-button')).toHaveCSS(
      'background-color',
      'rgb(21, 112, 239)'
    );
  });
});
