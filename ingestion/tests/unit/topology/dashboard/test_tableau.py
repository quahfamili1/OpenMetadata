"""
Test Tableau Dashboard
"""
import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from metadata.generated.schema.api.data.createChart import CreateChartRequest
from metadata.generated.schema.api.data.createDashboard import CreateDashboardRequest
from metadata.generated.schema.entity.data.dashboard import Dashboard
from metadata.generated.schema.entity.services.dashboardService import (
    DashboardConnection,
    DashboardService,
    DashboardServiceType,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    OpenMetadataWorkflowConfig,
)
from metadata.generated.schema.type.basic import FullyQualifiedEntityName
from metadata.generated.schema.type.entityReference import EntityReference
from metadata.generated.schema.type.usageDetails import UsageDetails, UsageStats
from metadata.generated.schema.type.usageRequest import UsageRequest
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.dashboard.dashboard_service import DashboardUsage
from metadata.ingestion.source.dashboard.tableau.metadata import (
    TableauDashboard,
    TableauSource,
)
from metadata.ingestion.source.dashboard.tableau.models import (
    TableauBaseModel,
    TableauChart,
    TableauOwner,
)

MOCK_DASHBOARD_SERVICE = DashboardService(
    id="c3eb265f-5445-4ad3-ba5e-797d3a3071bb",
    fullyQualifiedName=FullyQualifiedEntityName("tableau_source_test"),
    name="tableau_source_test",
    connection=DashboardConnection(),
    serviceType=DashboardServiceType.Tableau,
)

mock_tableau_config = {
    "source": {
        "type": "tableau",
        "serviceName": "test2",
        "serviceConnection": {
            "config": {
                "type": "Tableau",
                "authType": {"username": "username", "password": "abcdefg"},
                "hostPort": "http://tableauHost.com",
                "siteName": "tableauSiteName",
            }
        },
        "sourceConfig": {
            "config": {"dashboardFilterPattern": {}, "chartFilterPattern": {}}
        },
    },
    "sink": {"type": "metadata-rest", "config": {}},
    "workflowConfig": {
        "openMetadataServerConfig": {
            "hostPort": "http://localhost:8585/api",
            "authProvider": "openmetadata",
            "securityConfig": {
                "jwtToken": "eyJraWQiOiJHYjM4OWEtOWY3Ni1nZGpzLWE5MmotMDI0MmJrOTQzNTYiLCJ0eXAiOiJKV1QiLCJhbGc"
                "iOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlzQm90IjpmYWxzZSwiaXNzIjoib3Blbi1tZXRhZGF0YS5vcmciLCJpYXQiOjE"
                "2NjM5Mzg0NjIsImVtYWlsIjoiYWRtaW5Ab3Blbm1ldGFkYXRhLm9yZyJ9.tS8um_5DKu7HgzGBzS1VTA5uUjKWOCU0B_j08WXB"
                "iEC0mr0zNREkqVfwFDD-d24HlNEbrqioLsBuFRiwIWKc1m_ZlVQbG7P36RUxhuv2vbSp80FKyNM-Tj93FDzq91jsyNmsQhyNv_fN"
                "r3TXfzzSPjHt8Go0FMMP66weoKMgW2PbXlhVKwEuXUHyakLLzewm9UMeQaEiRzhiTMU3UkLXcKbYEJJvfNFcLwSl9W8JCO_l0Yj3u"
                "d-qt_nQYEZwqW6u5nfdQllN133iikV4fM5QZsMCnm8Rq1mvLR0y9bmJiD7fwM1tmJ791TUWqmKaTnP49U493VanKpUAfzIiOiIbhg"
            },
        }
    },
}

MOCK_DASHBOARD = TableauDashboard(
    id="42a5b706-739d-4d62-94a2-faedf33950a5",
    name="Regional",
    webpageUrl="http://tableauHost.com/#/site/hidarsite/workbooks/897790",
    description="tableau dashboard description",
    user_views=10,
    tags=[],
    owner=TableauOwner(
        id="1234", name="Dashboard Owner", email="samplemail@sample.com"
    ),
    charts=[
        TableauChart(
            id="b05695a2-d1ea-428e-96b2-858809809da4",
            name="Obesity",
            workbook=TableauBaseModel(id="42a5b706-739d-4d62-94a2-faedf33950a5"),
            sheetType="dashboard",
            viewUrlName="Obesity",
            contentUrl="Regional/sheets/Obesity",
            tags=[],
        ),
        TableauChart(
            id="106ff64d-537b-4534-8140-5d08c586e077",
            name="College",
            workbook=TableauBaseModel(id="42a5b706-739d-4d62-94a2-faedf33950a5"),
            sheetType="view",
            viewUrlName="College",
            contentUrl="Regional/sheets/College",
            tags=[],
        ),
        TableauChart(
            id="c1493abc-9057-4bdf-9061-c6d2908e4eaa",
            name="Global Temperatures",
            workbook=TableauBaseModel(id="42a5b706-739d-4d62-94a2-faedf33950a5"),
            sheetType="dashboard",
            viewUrlName="GlobalTemperatures",
            contentUrl="Regional/sheets/GlobalTemperatures",
            tags=[],
        ),
    ],
)

EXPECTED_DASHBOARD = [
    CreateDashboardRequest(
        name="42a5b706-739d-4d62-94a2-faedf33950a5",
        displayName="Regional",
        description="tableau dashboard description",
        sourceUrl="http://tableauHost.com/#/site/hidarsite/workbooks/897790/views",
        charts=[],
        tags=[],
        owners=None,
        service=FullyQualifiedEntityName("tableau_source_test"),
        extension=None,
    )
]

EXPECTED_CHARTS = [
    CreateChartRequest(
        name="b05695a2-d1ea-428e-96b2-858809809da4",
        displayName="Obesity",
        description=None,
        chartType="Other",
        sourceUrl="http://tableauHost.com/#/site/tableauSiteUrl/views/Regional/Obesity",
        tags=None,
        owners=None,
        service=FullyQualifiedEntityName("tableau_source_test"),
    ),
    CreateChartRequest(
        name="106ff64d-537b-4534-8140-5d08c586e077",
        displayName="College",
        description=None,
        chartType="Other",
        sourceUrl="http://tableauHost.com/#/site/tableauSiteUrl/views/Regional/College",
        tags=None,
        owners=None,
        service=FullyQualifiedEntityName("tableau_source_test"),
    ),
    CreateChartRequest(
        name="c1493abc-9057-4bdf-9061-c6d2908e4eaa",
        displayName="Global Temperatures",
        description=None,
        chartType="Other",
        sourceUrl="http://tableauHost.com/#/site/tableauSiteUrl/views/Regional/GlobalTemperatures",
        tags=None,
        owners=None,
        service=FullyQualifiedEntityName("tableau_source_test"),
    ),
]


class TableauUnitTest(TestCase):
    """
    Implements the necessary methods to extract
    Domo Dashboard Unit Test
    """

    @patch(
        "metadata.ingestion.source.dashboard.dashboard_service.DashboardServiceSource.test_connection"
    )
    @patch("metadata.ingestion.source.dashboard.tableau.connection.get_connection")
    def __init__(self, methodName, get_connection, test_connection) -> None:
        super().__init__(methodName)
        get_connection.return_value = False
        test_connection.return_value = False
        self.config = OpenMetadataWorkflowConfig.model_validate(mock_tableau_config)
        self.tableau = TableauSource.create(
            mock_tableau_config["source"],
            OpenMetadata(self.config.workflowConfig.openMetadataServerConfig),
        )
        self.tableau.client = SimpleNamespace()
        self.tableau.context.get().__dict__[
            "dashboard_service"
        ] = MOCK_DASHBOARD_SERVICE.fullyQualifiedName.root

    def test_dashboard_name(self):
        assert self.tableau.get_dashboard_name(MOCK_DASHBOARD) == MOCK_DASHBOARD.name

    def test_yield_chart(self):
        """
        Function for testing charts
        """
        chart_list = []
        results = self.tableau.yield_dashboard_chart(MOCK_DASHBOARD)
        for result in results:
            if isinstance(result, CreateChartRequest):
                chart_list.append(result)

        for _, (exptected, original) in enumerate(zip(EXPECTED_CHARTS, chart_list)):
            self.assertEqual(exptected, original)

    def test_yield_dashboard_usage(self):
        """
        Validate the logic for existing or new usage
        """
        self.tableau.context.get().__dict__["dashboard"] = "dashboard_name"

        # Start checking dashboard without usage
        # and a view count
        return_value = Dashboard(
            id=uuid.uuid4(),
            name="dashboard_name",
            fullyQualifiedName="dashboard_service.dashboard_name",
            service=EntityReference(id=uuid.uuid4(), type="dashboardService"),
        )
        with patch.object(OpenMetadata, "get_by_name", return_value=return_value):
            got_usage = next(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD))
            self.assertEqual(
                got_usage.right,
                DashboardUsage(
                    dashboard=return_value,
                    usage=UsageRequest(date=self.tableau.today, count=10),
                ),
            )

        # Now check what happens if we already have some summary data for today
        return_value = Dashboard(
            id=uuid.uuid4(),
            name="dashboard_name",
            fullyQualifiedName="dashboard_service.dashboard_name",
            service=EntityReference(id=uuid.uuid4(), type="dashboardService"),
            usageSummary=UsageDetails(
                dailyStats=UsageStats(count=10), date=self.tableau.today
            ),
        )
        with patch.object(OpenMetadata, "get_by_name", return_value=return_value):
            # Nothing is returned
            self.assertEqual(
                len(list(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD))), 0
            )

        # But if we have usage for today but the count is 0, we'll return the details
        return_value = Dashboard(
            id=uuid.uuid4(),
            name="dashboard_name",
            fullyQualifiedName="dashboard_service.dashboard_name",
            service=EntityReference(id=uuid.uuid4(), type="dashboardService"),
            usageSummary=UsageDetails(
                dailyStats=UsageStats(count=0), date=self.tableau.today
            ),
        )
        with patch.object(OpenMetadata, "get_by_name", return_value=return_value):
            self.assertEqual(
                next(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD)).right,
                DashboardUsage(
                    dashboard=return_value,
                    usage=UsageRequest(date=self.tableau.today, count=10),
                ),
            )

        # But if we have usage for another day, then we do the difference
        return_value = Dashboard(
            id=uuid.uuid4(),
            name="dashboard_name",
            fullyQualifiedName="dashboard_service.dashboard_name",
            service=EntityReference(id=uuid.uuid4(), type="dashboardService"),
            usageSummary=UsageDetails(
                dailyStats=UsageStats(count=5),
                date=datetime.strftime(datetime.now() - timedelta(1), "%Y-%m-%d"),
            ),
        )
        with patch.object(OpenMetadata, "get_by_name", return_value=return_value):
            self.assertEqual(
                next(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD)).right,
                DashboardUsage(
                    dashboard=return_value,
                    usage=UsageRequest(date=self.tableau.today, count=5),
                ),
            )

        # If the past usage is higher than what we have today, something weird is going on
        # we don't return usage but don't explode
        return_value = Dashboard(
            id=uuid.uuid4(),
            name="dashboard_name",
            fullyQualifiedName="dashboard_service.dashboard_name",
            service=EntityReference(id=uuid.uuid4(), type="dashboardService"),
            usageSummary=UsageDetails(
                dailyStats=UsageStats(count=1000),
                date=datetime.strftime(datetime.now() - timedelta(1), "%Y-%m-%d"),
            ),
        )
        with patch.object(OpenMetadata, "get_by_name", return_value=return_value):
            self.assertEqual(
                len(list(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD))), 1
            )

            self.assertIsNotNone(
                list(self.tableau.yield_dashboard_usage(MOCK_DASHBOARD))[0].left
            )

    def test_check_basemodel_returns_id_as_string(self):
        """
        Test that the basemodel returns the id as a string
        """
        base_model = TableauBaseModel(id=uuid.uuid4())
        self.assertEqual(base_model.id, str(base_model.id))

        base_model = TableauBaseModel(id="1234")
        self.assertEqual(base_model.id, "1234")
