/*
 *  Copyright 2021 Collate
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

package org.openmetadata.service.apps.bundles.changeEvent.slack;

import static org.openmetadata.schema.entity.events.SubscriptionDestination.SubscriptionType.SLACK;
import static org.openmetadata.service.util.SubscriptionUtil.appendHeadersToTarget;
import static org.openmetadata.service.util.SubscriptionUtil.deliverTestWebhookMessage;
import static org.openmetadata.service.util.SubscriptionUtil.getClient;
import static org.openmetadata.service.util.SubscriptionUtil.getTargetsForWebhookAlert;
import static org.openmetadata.service.util.SubscriptionUtil.postWebhookMessage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.Invocation;
import java.util.List;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.entity.events.EventSubscription;
import org.openmetadata.schema.entity.events.SubscriptionDestination;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.Webhook;
import org.openmetadata.service.apps.bundles.changeEvent.Destination;
import org.openmetadata.service.events.errors.EventPublisherException;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.formatter.decorators.MessageDecorator;
import org.openmetadata.service.formatter.decorators.SlackMessageDecorator;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;

@Slf4j
public class SlackEventPublisher implements Destination<ChangeEvent> {
  private final MessageDecorator<SlackMessage> slackMessageFormatter = new SlackMessageDecorator();
  private final Webhook webhook;
  private Invocation.Builder target;
  private final Client client;
  @Getter private final SubscriptionDestination subscriptionDestination;
  private final EventSubscription eventSubscription;

  public SlackEventPublisher(
      EventSubscription eventSubscription, SubscriptionDestination subscriptionDest) {
    if (subscriptionDest.getType() == SLACK) {
      this.eventSubscription = eventSubscription;
      this.subscriptionDestination = subscriptionDest;
      this.webhook = JsonUtils.convertValue(subscriptionDest.getConfig(), Webhook.class);

      // Build Client
      client = getClient(subscriptionDest.getTimeout(), subscriptionDest.getReadTimeout());

      // Build Target
      if (webhook != null && webhook.getEndpoint() != null) {
        String slackWebhookURL = webhook.getEndpoint().toString();
        if (!CommonUtil.nullOrEmpty(slackWebhookURL)) {
          target = appendHeadersToTarget(client, slackWebhookURL);
        }
      }
    } else {
      throw new IllegalArgumentException("Slack Alert Invoked with Illegal Type and Settings.");
    }
  }

  @Override
  public void sendMessage(ChangeEvent event) throws EventPublisherException {
    try {
      SlackMessage slackMessage =
          slackMessageFormatter.buildOutgoingMessage(getDisplayNameOrFqn(eventSubscription), event);

      String json = JsonUtils.pojoToJsonIgnoreNull(slackMessage);
      json = convertCamelCaseToSnakeCase(json);
      List<Invocation.Builder> targets =
          getTargetsForWebhookAlert(
              webhook, subscriptionDestination.getCategory(), SLACK, client, event);
      if (target != null) {
        targets.add(target);
      }
      for (Invocation.Builder actionTarget : targets) {
        if (webhook.getSecretKey() != null && !webhook.getSecretKey().isEmpty()) {
          String hmac = "sha256=" + CommonUtil.calculateHMAC(webhook.getSecretKey(), json);
          postWebhookMessage(this, actionTarget.header(RestUtil.SIGNATURE_HEADER, hmac), json);
        } else {
          postWebhookMessage(this, actionTarget, json);
        }
      }
    } catch (Exception e) {
      String message =
          CatalogExceptionMessage.eventPublisherFailedToPublish(SLACK, event, e.getMessage());
      LOG.error(message);
      throw new EventPublisherException(
          CatalogExceptionMessage.eventPublisherFailedToPublish(SLACK, e.getMessage()),
          Pair.of(subscriptionDestination.getId(), event));
    }
  }

  @Override
  public void sendTestMessage() throws EventPublisherException {
    try {
      SlackMessage slackMessage = slackMessageFormatter.buildOutgoingTestMessage();

      String json = JsonUtils.pojoToJsonIgnoreNull(slackMessage);
      json = convertCamelCaseToSnakeCase(json);
      if (target != null) {
        if (!CommonUtil.nullOrEmpty(webhook.getSecretKey())) {
          String hmac = "sha256=" + CommonUtil.calculateHMAC(webhook.getSecretKey(), json);
          deliverTestWebhookMessage(this, target.header(RestUtil.SIGNATURE_HEADER, hmac), json);
        } else {
          deliverTestWebhookMessage(this, target, json);
        }
      }
    } catch (Exception e) {
      String message = CatalogExceptionMessage.eventPublisherFailedToPublish(SLACK, e.getMessage());
      LOG.error(message);
      throw new EventPublisherException(message);
    }
  }

  /**
   * Slack messages sent via webhook require some keys in snake_case, while the Slack
   * app accepts them as they are (camelCase). Using Layout blocks (from com.slack.api.model.block) restricts control over key
   * aliases within the class.
   **/
  public String convertCamelCaseToSnakeCase(String jsonString) {
    JsonNode rootNode = JsonUtils.readTree(jsonString);
    JsonNode modifiedNode = convertKeys(rootNode);
    return JsonUtils.pojoToJsonIgnoreNull(modifiedNode);
  }

  private JsonNode convertKeys(JsonNode node) {
    if (node.isObject()) {
      ObjectNode objectNode = (ObjectNode) node;
      ObjectNode newNode = JsonUtils.getObjectNode();

      objectNode
          .fieldNames()
          .forEachRemaining(
              fieldName -> {
                String newFieldName = fieldName;
                if (fieldName.equals("imageUrl")) {
                  newFieldName = "image_url";
                } else if (fieldName.equals("altText")) {
                  newFieldName = "alt_text";
                }

                // Recursively convert the keys
                newNode.set(newFieldName, convertKeys(objectNode.get(fieldName)));
              });
      return newNode;
    } else if (node.isArray()) {
      ArrayNode arrayNode = (ArrayNode) node;
      ArrayNode newArrayNode = JsonUtils.getObjectNode().arrayNode();

      // recursively convert elements
      for (int i = 0; i < arrayNode.size(); i++) {
        newArrayNode.add(convertKeys(arrayNode.get(i)));
      }
      return newArrayNode;
    }
    return node;
  }

  @Override
  public EventSubscription getEventSubscriptionForDestination() {
    return eventSubscription;
  }

  @Override
  public boolean getEnabled() {
    return subscriptionDestination.getEnabled();
  }

  public void close() {
    if (null != client) {
      LOG.info("Closing Slack Client");
      client.close();
    }
  }
}
