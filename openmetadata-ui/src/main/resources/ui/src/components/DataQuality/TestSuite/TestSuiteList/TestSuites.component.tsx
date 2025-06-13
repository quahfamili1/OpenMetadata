/*
 *  Copyright 2023 Collate.
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
import { Button, Col, Form, Row, Select, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import { isEmpty } from 'lodash';
import QueryString from 'qs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { INITIAL_PAGING_VALUE, ROUTES } from '../../../../constants/constants';
import { PROGRESS_BAR_COLOR } from '../../../../constants/TestSuite.constant';
import { usePermissionProvider } from '../../../../context/PermissionProvider/PermissionProvider';
import {
  ERROR_PLACEHOLDER_TYPE,
  SORT_ORDER,
} from '../../../../enums/common.enum';
import {
  EntityTabs,
  EntityType,
  TabSpecificField,
} from '../../../../enums/entity.enum';
import { EntityReference } from '../../../../generated/entity/type';
import { TestSuite, TestSummary } from '../../../../generated/tests/testCase';
import { usePaging } from '../../../../hooks/paging/usePaging';
import useCustomLocation from '../../../../hooks/useCustomLocation/useCustomLocation';
import { DataQualityPageTabs } from '../../../../pages/DataQuality/DataQualityPage.interface';
import { useDataQualityProvider } from '../../../../pages/DataQuality/DataQualityProvider';
import {
  getListTestSuitesBySearch,
  ListTestSuitePramsBySearch,
  TestSuiteType,
} from '../../../../rest/testAPI';
import { getEntityName } from '../../../../utils/EntityUtils';
import {
  getEntityDetailsPath,
  getTestSuitePath,
} from '../../../../utils/RouterUtils';
import { ownerTableObject } from '../../../../utils/TableColumn.util';
import { showErrorToast } from '../../../../utils/ToastUtils';
import ErrorPlaceHolder from '../../../common/ErrorWithPlaceholder/ErrorPlaceHolder';
import FilterTablePlaceHolder from '../../../common/ErrorWithPlaceholder/FilterTablePlaceHolder';
import { PagingHandlerParams } from '../../../common/NextPrevious/NextPrevious.interface';
import Searchbar from '../../../common/SearchBarComponent/SearchBar.component';
import Table from '../../../common/Table/Table';
import { UserTeamSelectableList } from '../../../common/UserTeamSelectableList/UserTeamSelectableList.component';
import { TableProfilerTab } from '../../../Database/Profiler/ProfilerDashboard/profilerDashboard.interface';
import ProfilerProgressWidget from '../../../Database/Profiler/TableProfiler/ProfilerProgressWidget/ProfilerProgressWidget';
import { TestSuiteSearchParams } from '../../DataQuality.interface';
import { SummaryPanel } from '../../SummaryPannel/SummaryPanel.component';

export const TestSuites = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useCustomLocation();
  const {
    isTestCaseSummaryLoading,
    testCaseSummary,
    activeTab: tab,
  } = useDataQualityProvider();

  const params = useMemo(() => {
    const search = location.search;

    const params = QueryString.parse(
      search.startsWith('?') ? search.substring(1) : search
    );

    return params as TestSuiteSearchParams;
  }, [location]);
  const { searchValue, owner } = params;
  const selectedOwner = useMemo(
    () => (owner ? JSON.parse(owner) : undefined),
    [owner]
  );

  const { permissions } = usePermissionProvider();
  const { testSuite: testSuitePermission } = permissions;
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const {
    currentPage,
    pageSize,
    paging,
    handlePageChange,
    handlePageSizeChange,
    handlePagingChange,
    showPagination,
  } = usePaging();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const ownerFilterValue = useMemo(() => {
    return selectedOwner
      ? {
          key: selectedOwner.fullyQualifiedName ?? selectedOwner.name,
          label: getEntityName(selectedOwner),
        }
      : undefined;
  }, [selectedOwner]);
  const columns = useMemo(() => {
    const data: ColumnsType<TestSuite> = [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 600,
        sorter: (a, b) => {
          if (a.basic) {
            // Sort for basic test suites
            return (
              a.basicEntityReference?.fullyQualifiedName?.localeCompare(
                b.basicEntityReference?.fullyQualifiedName ?? ''
              ) ?? 0
            );
          } else {
            // Sort for logical test suites
            return (
              a.fullyQualifiedName?.localeCompare(b.fullyQualifiedName ?? '') ??
              0
            );
          }
        },
        sortDirections: ['ascend', 'descend'],
        render: (name, record) => {
          return (
            <Typography.Paragraph className="m-0" style={{ maxWidth: 580 }}>
              {record.basic ? (
                <Link
                  data-testid={name}
                  to={{
                    pathname: getEntityDetailsPath(
                      EntityType.TABLE,
                      record.basicEntityReference?.fullyQualifiedName ?? '',
                      EntityTabs.PROFILER
                    ),
                    search: QueryString.stringify({
                      activeTab: TableProfilerTab.DATA_QUALITY,
                    }),
                  }}>
                  {record.basicEntityReference?.fullyQualifiedName ??
                    record.basicEntityReference?.name}
                </Link>
              ) : (
                <Link
                  data-testid={name}
                  to={getTestSuitePath(
                    record.fullyQualifiedName ?? record.name
                  )}>
                  {getEntityName(record)}
                </Link>
              )}
            </Typography.Paragraph>
          );
        },
      },
      {
        title: t('label.test-plural'),
        dataIndex: 'summary',
        key: 'tests',
        width: 100,
        render: (value: TestSummary) => value?.total ?? 0,
      },
      {
        title: `${t('label.success')} %`,
        dataIndex: 'summary',
        width: 200,
        key: 'success',
        render: (value: TestSuite['summary']) => {
          const percent =
            value?.total && value?.success ? value.success / value.total : 0;

          return (
            <ProfilerProgressWidget
              strokeColor={PROGRESS_BAR_COLOR}
              value={percent}
            />
          );
        },
      },
      ...ownerTableObject<TestSuite>(),
    ];

    return data;
  }, []);

  const fetchTestSuites = async (
    currentPage = INITIAL_PAGING_VALUE,
    params?: ListTestSuitePramsBySearch
  ) => {
    setIsLoading(true);
    try {
      const result = await getListTestSuitesBySearch({
        ...params,
        fields: [TabSpecificField.OWNERS, TabSpecificField.SUMMARY],
        q: searchValue ? `*${searchValue}*` : undefined,
        owner: ownerFilterValue?.key,
        offset: (currentPage - 1) * pageSize,
        includeEmptyTestSuites: tab !== DataQualityPageTabs.TABLES,
        testSuiteType:
          tab === DataQualityPageTabs.TABLES
            ? TestSuiteType.basic
            : TestSuiteType.logical,
        sortField: 'testCaseResultSummary.timestamp',
        sortType: SORT_ORDER.DESC,
        sortNestedPath: 'testCaseResultSummary',
        sortNestedMode: ['max'],
      });
      setTestSuites(result.data);
      handlePagingChange(result.paging);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSuitesPageChange = useCallback(
    ({ currentPage }: PagingHandlerParams) => {
      fetchTestSuites(currentPage, { limit: pageSize });
      handlePageChange(currentPage);
    },
    [pageSize, paging]
  );

  const handleSearchParam = (
    value: string,
    key: keyof TestSuiteSearchParams
  ) => {
    history.push({
      search: QueryString.stringify({
        ...params,
        [key]: isEmpty(value) ? undefined : value,
      }),
    });
  };

  const handleOwnerSelect = (owners: EntityReference[] = []) => {
    handleSearchParam(
      owners?.length > 0 ? JSON.stringify(owners?.[0]) : '',
      'owner'
    );
  };

  useEffect(() => {
    if (testSuitePermission?.ViewAll || testSuitePermission?.ViewBasic) {
      fetchTestSuites(INITIAL_PAGING_VALUE, {
        limit: pageSize,
      });
    } else {
      setIsLoading(false);
    }
  }, [testSuitePermission, pageSize, searchValue, owner]);

  if (!testSuitePermission?.ViewAll && !testSuitePermission?.ViewBasic) {
    return (
      <ErrorPlaceHolder
        className="border-none"
        permissionValue={t('label.view-entity', {
          entity: t('label.test-suite'),
        })}
        type={ERROR_PLACEHOLDER_TYPE.PERMISSION}
      />
    );
  }

  return (
    <Row data-testid="test-suite-container" gutter={[16, 16]}>
      <Col span={24}>
        <Row justify="space-between">
          <Col>
            <Form layout="inline">
              <Space
                align="center"
                className="w-full justify-between"
                size={16}>
                <Form.Item className="m-0 w-80">
                  <Searchbar
                    removeMargin
                    searchValue={searchValue}
                    onSearch={(value) =>
                      handleSearchParam(value, 'searchValue')
                    }
                  />
                </Form.Item>
                <Form.Item
                  className="m-0"
                  label={t('label.owner')}
                  name="owner">
                  <UserTeamSelectableList
                    hasPermission
                    owner={selectedOwner}
                    onUpdate={(updatedUser) => handleOwnerSelect(updatedUser)}>
                    <Select
                      data-testid="owner-select-filter"
                      open={false}
                      placeholder={t('label.owner')}
                      value={ownerFilterValue}
                    />
                  </UserTeamSelectableList>
                </Form.Item>
              </Space>
            </Form>
          </Col>
          <Col>
            {tab === DataQualityPageTabs.TEST_SUITES &&
              testSuitePermission?.Create && (
                <Link
                  data-testid="add-test-suite-btn"
                  to={ROUTES.ADD_TEST_SUITES}>
                  <Button type="primary">
                    {t('label.add-entity', { entity: t('label.test-suite') })}
                  </Button>
                </Link>
              )}
          </Col>
        </Row>
      </Col>

      <Col span={24}>
        <SummaryPanel
          showAdditionalSummary
          isLoading={isTestCaseSummaryLoading}
          testSummary={testCaseSummary}
        />
      </Col>
      <Col span={24}>
        <Table
          columns={columns}
          customPaginationProps={{
            currentPage,
            isLoading,
            pageSize,
            isNumberBased: true,
            paging,
            pagingHandler: handleTestSuitesPageChange,
            onShowSizeChange: handlePageSizeChange,
            showPagination,
          }}
          data-testid="test-suite-table"
          dataSource={testSuites}
          loading={isLoading}
          locale={{
            emptyText: <FilterTablePlaceHolder />,
          }}
          pagination={false}
          scroll={{
            x: true,
          }}
          size="small"
        />
      </Col>
    </Row>
  );
};
