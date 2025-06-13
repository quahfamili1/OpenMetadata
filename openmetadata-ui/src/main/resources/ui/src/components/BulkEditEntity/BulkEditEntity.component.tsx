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
import ReactDataGrid from '@inovua/reactdatagrid-community';
import { Button, Col, Row } from 'antd';
import { isEmpty } from 'lodash';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { readString } from 'react-papaparse';
import { useHistory, useParams } from 'react-router-dom';
import { ENTITY_BULK_EDIT_STEPS } from '../../constants/BulkEdit.constants';
import { ExportTypes } from '../../constants/Export.constants';
import { EntityType } from '../../enums/entity.enum';
import { useFqn } from '../../hooks/useFqn';
import { getBulkEditCSVExportEntityApi } from '../../utils/EntityBulkEdit/EntityBulkEditUtils';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import Banner from '../common/Banner/Banner';
import { ImportStatus } from '../common/EntityImport/ImportStatus/ImportStatus.component';
import Loader from '../common/Loader/Loader';
import TitleBreadcrumb from '../common/TitleBreadcrumb/TitleBreadcrumb.component';
import { useEntityExportModalProvider } from '../Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import Stepper from '../Settings/Services/Ingestion/IngestionStepper/IngestionStepper.component';
import { BulkEditEntityProps } from './BulkEditEntity.interface';

const BulkEditEntity = ({
  onKeyDown,
  onEditStop,
  onEditStart,
  onEditComplete,
  dataSource,
  columns,
  breadcrumbList,
  setGridRef,
  activeStep,
  handleBack,
  handleValidate,
  isValidating,
  validationData,
  validateCSVData,
  activeAsyncImportJob,
  onCSVReadComplete,
}: BulkEditEntityProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { fqn } = useFqn();
  const { entityType } = useParams<{ entityType: EntityType }>();
  const { triggerExportForBulkEdit, csvExportData, clearCSVExportData } =
    useEntityExportModalProvider();

  const handleCancel = () => {
    clearCSVExportData();
    history.push(entityUtilClassBase.getEntityLink(entityType, fqn));
  };

  useEffect(() => {
    triggerExportForBulkEdit({
      name: fqn,
      onExport: getBulkEditCSVExportEntityApi(entityType),
      exportTypes: [ExportTypes.CSV],
    });
  }, []);

  useEffect(() => {
    if (csvExportData) {
      readString(csvExportData, {
        worker: true,
        skipEmptyLines: true,
        complete: onCSVReadComplete,
      });
    }
  }, [csvExportData]);

  useEffect(() => {
    // clear the csvExportData data from the state
    return () => {
      clearCSVExportData();
    };
  }, []);

  return (
    <>
      <Col span={24}>
        <TitleBreadcrumb titleLinks={breadcrumbList} />
      </Col>
      <Col span={24}>
        <Stepper
          activeStep={activeStep}
          className="w-max-600 mx-auto"
          steps={ENTITY_BULK_EDIT_STEPS}
        />
      </Col>

      <Col span={24}>
        {activeAsyncImportJob?.jobId && (
          <Banner
            className="border-radius"
            isLoading={!activeAsyncImportJob.error}
            message={
              activeAsyncImportJob.error ?? activeAsyncImportJob.message ?? ''
            }
            type={activeAsyncImportJob.error ? 'error' : 'success'}
          />
        )}
      </Col>

      {isEmpty(csvExportData) ? (
        <Loader />
      ) : (
        <>
          <Col span={24}>
            {activeStep === 1 && (
              <ReactDataGrid
                editable
                columns={columns}
                dataSource={dataSource}
                defaultActiveCell={[0, 0]}
                handle={setGridRef}
                idProperty="id"
                loading={isValidating}
                minRowHeight={30}
                showZebraRows={false}
                style={{ height: 'calc(100vh - 245px)' }}
                onEditComplete={onEditComplete}
                onEditStart={onEditStart}
                onEditStop={onEditStop}
                onKeyDown={onKeyDown}
              />
            )}

            {activeStep === 2 && validationData && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <ImportStatus csvImportResult={validationData} />
                </Col>

                <Col span={24}>
                  {validateCSVData && (
                    <ReactDataGrid
                      idProperty="id"
                      loading={isValidating}
                      style={{ height: 'calc(100vh - 300px)' }}
                      {...validateCSVData}
                    />
                  )}
                </Col>
              </Row>
            )}
          </Col>
          {activeStep > 0 && (
            <Col span={24}>
              <div className="float-right import-footer">
                {activeStep === 1 && (
                  <Button disabled={isValidating} onClick={handleCancel}>
                    {t('label.cancel')}
                  </Button>
                )}

                {activeStep > 1 && (
                  <Button disabled={isValidating} onClick={handleBack}>
                    {t('label.previous')}
                  </Button>
                )}
                {activeStep < 3 && (
                  <Button
                    className="m-l-sm"
                    disabled={isValidating}
                    type="primary"
                    onClick={handleValidate}>
                    {activeStep === 2 ? t('label.update') : t('label.next')}
                  </Button>
                )}
              </div>
            </Col>
          )}
        </>
      )}
    </>
  );
};

export default BulkEditEntity;
