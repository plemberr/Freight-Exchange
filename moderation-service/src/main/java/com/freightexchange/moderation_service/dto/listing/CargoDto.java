package com.freightexchange.moderation_service.dto.listing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CargoDto {

    private String cargoType;

    private Double weight;

    private Double volume;

    private Double length;

    private Double width;

    private Double height;
    
    private Double price;

}