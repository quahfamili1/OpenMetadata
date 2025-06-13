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
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-test-renderer';
import { WidgetWidths } from '../../../../enums/CustomizablePage.enum';
import { MOCK_KPI_LIST_RESPONSE } from '../../../../pages/KPIPage/KPIMock.mock';
import { getListKPIs } from '../../../../rest/KpiAPI';
import KPIWidget from './KPIWidget.component';

jest.mock('../../../../constants/DataInsight.constants', () => ({
  DATA_INSIGHT_GRAPH_COLORS: ['#E7B85D'],
}));

jest.mock('../../../../constants/constants', () => ({
  CHART_WIDGET_DAYS_DURATION: 14,
  GRAPH_BACKGROUND_COLOR: '#000000',
}));

jest.mock('../../../../utils/date-time/DateTimeUtils', () => ({
  customFormatDateTime: jest.fn().mockReturnValue('Dec 05, 11:54'),
  getCurrentMillis: jest.fn().mockReturnValue(1711583974000),
  getEpochMillisForPastDays: jest.fn().mockReturnValue(1709424034000),
}));

jest.mock('../../../../rest/DataInsightAPI', () => ({
  DataInsightCustomChartResult: jest
    .fn()
    .mockImplementation(() => Promise.resolve()),
}));

jest.mock('../../../../rest/KpiAPI', () => ({
  getLatestKpiResult: jest.fn().mockImplementation(() =>
    Promise.resolve({
      timestamp: 1724760319723,
      kpiFqn: 'description-percentage',
      targetResult: [
        {
          value: '23.52941176470588',
          targetMet: false,
        },
      ],
    })
  ),
  getListKpiResult: jest.fn().mockImplementation(() =>
    Promise.resolve({
      results: [
        {
          count: 23.52941176470588,
          day: 1724716800000,
        },
      ],
    })
  ),
  getListKPIs: jest
    .fn()
    .mockImplementation(() => Promise.resolve(MOCK_KPI_LIST_RESPONSE)),
}));

jest.mock('../../../../utils/ToastUtils', () => ({
  showErrorToast: jest.fn(),
}));

jest.mock('../../../../utils/CommonUtils', () => ({
  Transi18next: jest.fn().mockReturnValue('text'),
}));

jest.mock('../../../DataInsight/KPILatestResultsV1', () =>
  jest.fn().mockReturnValue(<p>KPILatestResultsV1.Component</p>)
);

jest.mock('../../../common/ErrorWithPlaceholder/ErrorPlaceHolder', () =>
  jest.fn().mockReturnValue(<p>ErrorPlaceHolder.Component</p>)
);

const mockHandleRemoveWidget = jest.fn();

const widgetProps = {
  selectedGridSize: WidgetWidths.medium,
  isEditView: true,
  widgetKey: 'testWidgetKey',
  handleRemoveWidget: mockHandleRemoveWidget,
};

describe('KPIWidget', () => {
  it('should fetch kpi list api initially', async () => {
    render(<KPIWidget {...widgetProps} />);

    expect(getListKPIs).toHaveBeenCalledWith({ fields: 'dataInsightChart' });
  });

  it('should handle close click when in edit view', async () => {
    await act(async () => {
      render(<KPIWidget {...widgetProps} />);
    });

    fireEvent.click(screen.getByTestId('remove-widget-button'));

    expect(mockHandleRemoveWidget).toHaveBeenCalledWith(widgetProps.widgetKey);
  });

  it('should render charts and data if present', async () => {
    await act(async () => {
      render(<KPIWidget {...widgetProps} />);
    });

    expect(screen.getByText('label.kpi-title')).toBeInTheDocument();
    expect(
      screen.getByText('KPILatestResultsV1.Component')
    ).toBeInTheDocument();
  });

  it('should not render data if selectedGridSize is small', async () => {
    await act(async () => {
      render(
        <KPIWidget {...widgetProps} selectedGridSize={WidgetWidths.small} />
      );
    });

    expect(screen.getByText('label.kpi-title')).toBeInTheDocument();
    expect(
      screen.queryByText('KPILatestResultsV1.Component')
    ).not.toBeInTheDocument();
  });

  it('should render ErrorPlaceholder if no data there', async () => {
    (getListKPIs as jest.Mock).mockImplementation(() => Promise.resolve());

    await act(async () => {
      render(<KPIWidget {...widgetProps} />);
    });

    expect(screen.getByText('ErrorPlaceHolder.Component')).toBeInTheDocument();
  });
});
