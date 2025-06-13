/*
 *  Copyright 2025 Collate.
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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { TermBoost } from '../../../generated/configuration/searchSettings';
import tagClassBase from '../../../utils/TagClassBase';
import TermBoostComponent from './TermBoost';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

jest.mock('../../../utils/TagClassBase', () => ({
  getTags: jest.fn(),
}));

const mockTermBoost: TermBoost = {
  field: 'tags.tagFQN',
  value: 'PII.Sensitive',
  boost: 5,
};

const mockProps = {
  termBoost: mockTermBoost,
  onTermBoostChange: jest.fn(),
  onDeleteBoost: jest.fn(),
};

const mockTagResponse = {
  data: [
    {
      data: {
        name: 'Sensitive',
        displayName: 'Sensitive',
        fullyQualifiedName: 'PII.Sensitive',
      },
    },
  ],
};

describe('TermBoost Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tagClassBase.getTags as jest.Mock).mockResolvedValue(mockTagResponse);
  });

  it('Should render component with initial values', () => {
    render(<TermBoostComponent {...mockProps} />);

    expect(screen.getByTestId('term-boost-impact-label')).toBeInTheDocument();
    expect(screen.getByTestId('term-boost-value')).toBeInTheDocument();
    expect(screen.getByTestId('term-boost-slider')).toBeInTheDocument();
    expect(screen.getByTestId('term-boost-select')).toBeInTheDocument();
  });

  it('Should handle tag selection', async () => {
    render(<TermBoostComponent {...mockProps} />);

    const select = screen.getByTestId('term-boost-select');
    fireEvent.mouseDown(select);

    await waitFor(() => {
      expect(tagClassBase.getTags).toHaveBeenCalled();
    });

    expect(screen.getByText('PII.Sensitive')).toBeInTheDocument();
  });

  it('Should handle delete tag boost', () => {
    render(<TermBoostComponent {...mockProps} />);

    const deleteIcon = screen.getByTestId('delete-term-boost');
    fireEvent.click(deleteIcon);

    expect(mockProps.onDeleteBoost).toHaveBeenCalledWith('PII.Sensitive');
  });
});
