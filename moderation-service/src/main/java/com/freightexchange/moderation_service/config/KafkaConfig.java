package com.freightexchange.moderation_service.config;

import com.freightexchange.moderation_service.dto.event.ListingApprovedEvent;
import com.freightexchange.moderation_service.dto.event.ListingDeletedEvent;
import com.freightexchange.moderation_service.dto.event.ListingRejectedEvent;
import com.freightexchange.moderation_service.dto.event.ListingSentToModerationEvent;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;

import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;

import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    /*
     |--------------------------------------------------------------------------
     | Topics
     |--------------------------------------------------------------------------
     */

    @Bean
    public NewTopic listingSentToModerationTopic() {
        return TopicBuilder
                .name("listing.sent_to_moderation")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic listingDeletedTopic() {
        return TopicBuilder
                .name("listing.deleted")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic listingApprovedTopic() {
        return TopicBuilder
                .name("listing.approved")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic listingRejectedTopic() {
        return TopicBuilder
                .name("listing.rejected")
                .partitions(1)
                .replicas(1)
                .build();
    }

    /*
     |--------------------------------------------------------------------------
     | Producer config
     |--------------------------------------------------------------------------
     */

    @Bean
    public ProducerFactory<String, Object> producerFactory() {

        Map<String, Object> config = new HashMap<>();

        config.put(
                ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
                bootstrapServers
        );

        config.put(
                ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
                StringSerializer.class
        );

        config.put(
                ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
                JsonSerializer.class
        );

        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    /*
     |--------------------------------------------------------------------------
     | listing.sent_to_moderation consumer
     |--------------------------------------------------------------------------
     */

    @Bean
    public ConsumerFactory<String, ListingSentToModerationEvent>
    listingSentToModerationConsumerFactory() {

        JsonDeserializer<ListingSentToModerationEvent> deserializer =
                new JsonDeserializer<>(ListingSentToModerationEvent.class);

        deserializer.addTrustedPackages("*");

        Map<String, Object> config = baseConsumerConfig();

        return new DefaultKafkaConsumerFactory<>(
                config,
                new StringDeserializer(),
                deserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<
            String,
            ListingSentToModerationEvent
            > listingSentToModerationKafkaListenerFactory() {

        ConcurrentKafkaListenerContainerFactory<
                String,
                ListingSentToModerationEvent
                > factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(
                listingSentToModerationConsumerFactory()
        );

        return factory;
    }

    /*
     |--------------------------------------------------------------------------
     | listing.deleted consumer
     |--------------------------------------------------------------------------
     */

    @Bean
    public ConsumerFactory<String, ListingDeletedEvent>
    listingDeletedConsumerFactory() {

        JsonDeserializer<ListingDeletedEvent> deserializer =
                new JsonDeserializer<>(ListingDeletedEvent.class);

        deserializer.addTrustedPackages("*");

        Map<String, Object> config = baseConsumerConfig();

        return new DefaultKafkaConsumerFactory<>(
                config,
                new StringDeserializer(),
                deserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<
            String,
            ListingDeletedEvent
            > listingDeletedKafkaListenerFactory() {

        ConcurrentKafkaListenerContainerFactory<
                String,
                ListingDeletedEvent
                > factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(
                listingDeletedConsumerFactory()
        );

        return factory;
    }

    /*
     |--------------------------------------------------------------------------
     | Base consumer config
     |--------------------------------------------------------------------------
     */

    private Map<String, Object> baseConsumerConfig() {

        Map<String, Object> config = new HashMap<>();

        config.put(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
                bootstrapServers
        );

        config.put(
                ConsumerConfig.GROUP_ID_CONFIG,
                "moderation-group"
        );

        config.put(
                ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,
                "earliest"
        );

        config.put(
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                StringDeserializer.class
        );

        config.put(
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                JsonDeserializer.class
        );

        return config;
    }
}