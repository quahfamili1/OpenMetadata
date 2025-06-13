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
import {
  TypeColumn,
  TypeComputedProps,
} from '@inovua/reactdatagrid-community/types';
import { VALIDATION_STEP } from '../../constants/BulkImport.constant';
import { CSVImportResult } from '../../generated/type/csvImportResult';
import { CSVImportJobType } from '../../pages/EntityImport/BulkEntityImportPage/BulkEntityImportPage.interface';
import { TitleBreadcrumbProps } from '../common/TitleBreadcrumb/TitleBreadcrumb.interface';

export interface BulkEditEntityProps {
  dataSource: Record<string, string>[];
  columns: TypeColumn[];
  breadcrumbList: TitleBreadcrumbProps['titleLinks'];
  activeStep: VALIDATION_STEP;
  activeAsyncImportJob?: CSVImportJobType;
  isValidating: boolean;
  validationData?: CSVImportResult;
  validateCSVData?: {
    columns: TypeColumn[];
    dataSource: Record<string, string>[];
  };
  handleBack: () => void;
  handleValidate: () => Promise<void>;
  setGridRef: React.Dispatch<
    React.SetStateAction<React.MutableRefObject<TypeComputedProps | null>>
  >;
  onKeyDown: (event: KeyboardEvent) => void;
  onEditStop: () => void;
  onEditStart: () => void;
  onCSVReadComplete: (results: { data: string[][] }) => void;
  onEditComplete: ({ value, columnId, rowId }: any) => void;
}
