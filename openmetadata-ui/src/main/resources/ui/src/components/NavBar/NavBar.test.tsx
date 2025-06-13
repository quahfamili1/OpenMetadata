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
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { ONE_HOUR_MS } from '../../constants/constants';
import { HELP_ITEMS_ENUM } from '../../constants/Navbar.constants';
import { getVersion } from '../../rest/miscAPI';
import { getHelpDropdownItems } from '../../utils/NavbarUtils';
import NavBarComponent from './NavBar';

// Place these at the very top of your test file, before any imports!
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('cookie-storage', () => ({
  CookieStorage: class {
    getItem(...args: any[]) {
      return mockGetItem(...args);
    }
    setItem(...args: any[]) {
      return mockSetItem(...args);
    }
    constructor() {
      // Do nothing
    }
  },
}));

jest.mock('../../hooks/useApplicationStore', () => ({
  useApplicationStore: jest.fn().mockImplementation(() => ({
    searchCriteria: '',
    updateSearchCriteria: jest.fn(),
  })),
}));

jest.mock('../GlobalSearchBar/GlobalSearchBar', () => ({
  GlobalSearchBar: jest
    .fn()
    .mockImplementation(() => (
      <div data-testid="global-search-bar">GlobalSearchBar</div>
    )),
}));

jest.mock('../../context/WebSocketProvider/WebSocketProvider', () => ({
  useWebSocketConnector: jest.fn().mockImplementation(() => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
    },
  })),
}));
jest.mock('../../utils/BrowserNotificationUtils', () => ({
  hasNotificationPermission: jest.fn(),
  shouldRequestPermission: jest.fn(),
}));
jest.mock('../../utils/CommonUtils', () => ({
  refreshPage: jest.fn(),
  getEntityDetailLink: jest.fn(),
  getNameFromFQN: jest.fn().mockImplementation((value) => value),
}));
jest.mock('../../utils/FeedUtils', () => ({
  getEntityFQN: jest.fn().mockReturnValue('entityFQN'),
  getEntityType: jest.fn().mockReturnValue('entityType'),
  prepareFeedLink: jest.fn().mockReturnValue('entity-link'),
}));

jest.mock('../../hooks/useDomainStore', () => ({
  useDomainStore: jest.fn().mockImplementation(() => ({
    domainOptions: jest.fn().mockReturnValue('domainOptions'),
    activeDomain: jest.fn().mockReturnValue('activeDomain'),
    updateActiveDomain: jest.fn(),
  })),
}));

jest.mock('../Modals/WhatsNewModal/WhatsNewModal', () => {
  return jest
    .fn()
    .mockImplementation(() => (
      <p data-testid="whats-new-modal-close">WhatsNewModal</p>
    ));
});

jest.mock('../NotificationBox/NotificationBox.component', () => {
  return jest.fn().mockImplementation(({ onTabChange }) => (
    <div data-testid="tab-change" onClick={onTabChange}>
      tab change
    </div>
  ));
});

jest.mock(
  '../Settings/Users/UserProfileIcon/UserProfileIcon.component',
  () => ({
    UserProfileIcon: jest
      .fn()
      .mockReturnValue(
        <div data-testid="user-profile-icon">UserProfileIcon</div>
      ),
  })
);
jest.mock('../../hooks/useCustomLocation/useCustomLocation', () => {
  return jest
    .fn()
    .mockImplementation(() => ({ search: 'search', pathname: '/my-data' }));
});
jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
}));

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),

  Dropdown: jest.fn().mockImplementation(({ dropdownRender }) => {
    return (
      <div data-testid="dropdownRender">
        <div>{dropdownRender}</div>
      </div>
    );
  }),
}));

jest.mock('../../utils/NavbarUtils', () => ({
  getHelpDropdownItems: jest.fn().mockReturnValue([
    {
      label: <p data-testid="whats-new">Whats New</p>,
      key: HELP_ITEMS_ENUM.WHATS_NEW,
    },
  ]),
}));

jest.mock('../../rest/miscAPI', () => ({
  getVersion: jest.fn().mockResolvedValue({
    version: '0.5.0-SNAPSHOT',
  }),
}));

describe('Test NavBar Component', () => {
  it('Should render NavBar component', async () => {
    render(<NavBarComponent />);

    expect(await screen.findByTestId('global-search-bar')).toBeInTheDocument();
    expect(await screen.findByTestId('user-profile-icon')).toBeInTheDocument();
    expect(
      await screen.findByTestId('whats-new-alert-card')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('whats-new-alert-header')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('close-whats-new-alert')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('label.whats-new-version')
    ).toBeInTheDocument();
  });

  it('should call getVersion onMount', () => {
    render(<NavBarComponent />);

    expect(getVersion).toHaveBeenCalled();
  });

  it('should call getHelpDropdownItems function', async () => {
    render(<NavBarComponent />);

    expect(getHelpDropdownItems).toHaveBeenCalled();
  });
});

// --- Additional tests for fetchOMVersion one hour threshold ---
describe('fetchOMVersion one hour threshold', () => {
  const OLD_DATE_NOW = Date.now;

  beforeEach(() => {
    jest.resetModules();

    global.Date.now = jest.fn();
  });

  afterEach(() => {
    global.Date.now = OLD_DATE_NOW;
  });

  it('should NOT call getVersion if less than one hour since last fetch', async () => {
    const now = 2000000;
    const lastFetch = now - (ONE_HOUR_MS - 1000); // less than 1 hour ago
    mockGetItem.mockReturnValue(String(lastFetch));
    jest.spyOn(global.Date, 'now').mockReturnValue(now);

    render(<NavBarComponent />);
    await screen.findByTestId('global-search-bar');

    expect(getVersion).not.toHaveBeenCalled();
  });

  it('should call getVersion and setItem if more than one hour since last fetch', async () => {
    const now = 3000000;
    const lastFetch = now - (ONE_HOUR_MS + 1000); // more than 1 hour ago
    mockGetItem.mockReturnValue(String(lastFetch));
    (global.Date.now as jest.Mock).mockReturnValue(now);

    render(<NavBarComponent />);
    await Promise.resolve();

    await act(async () => {
      expect(getVersion).toHaveBeenCalled();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'versionFetchTime',
      '3000000',
      expect.objectContaining({ expires: expect.any(Date) })
    );
  });
});
