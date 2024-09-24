package com.fitty.meal_.service.mapper;

import com.fitty.meal_.service.api.dto.CategoryDTO;
import com.fitty.meal_.service.api.dto.FoodItemDTO;
import com.fitty.meal_.service.api.dto.MealRequestDTO;
import com.fitty.meal_.service.api.dto.MealResponseDTO;
import com.fitty.meal_.service.impl.entity.Category;
import com.fitty.meal_.service.impl.entity.FoodItem;
import com.fitty.meal_.service.impl.entity.Meal;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MealMapper {

    public MealResponseDTO mapMealToMealResponseDTO(Meal meal) {
        return MealResponseDTO.builder()
                .id(meal.getId())
                .name(meal.getName())
                .description(meal.getDescription())
                .foodItems(mapFoodItemsToFoodItemsDTO(meal.getFoodItems()))
                .build();
    }

    public Meal mapMealRequestToMeal(MealRequestDTO mealRequestDTO) {
        Meal meal = Meal.builder()
                .id(UUID.randomUUID())
                .name(mealRequestDTO.getName())
                .description(mealRequestDTO.getDescription())
                .build();

        List<FoodItem> foodItems = mapFoodItemsDTOToFoodItems(mealRequestDTO.getFoodItems(), meal);
        meal.setFoodItems(foodItems);

        return meal;
    }

    private List<FoodItem> mapFoodItemsDTOToFoodItems(List<FoodItemDTO> foodItemDTOs, Meal meal) {
        List<FoodItem> foodItems = new ArrayList<>();
        for (FoodItemDTO foodItemDTO : foodItemDTOs) {
            FoodItem foodItem = mapFoodItemDTOToFoodItem(foodItemDTO,meal);
            foodItem.setMeal(meal); // Imposta il Meal in ogni FoodItem
            foodItems.add(foodItem);
            foodItem.setCategory(mapCategoryDTOToCategory(foodItemDTO.getCategory(),meal));

        }
        return foodItems;
    }

    private FoodItem mapFoodItemDTOToFoodItem(FoodItemDTO foodItemDTO, Meal meal) {
        FoodItem foodItem = FoodItem.builder()
                .id(UUID.randomUUID())
                .name(foodItemDTO.getName())
                .description(foodItemDTO.getDescription())
                .calories(foodItemDTO.getCalories())
                .quantity(foodItemDTO.getQuantity())
                .nutrients(foodItemDTO.getNutrients())
                .category(mapCategoryDTOToCategory(foodItemDTO.getCategory(),meal))
                .build();
        return foodItem;
    }

    private Category mapCategoryDTOToCategory(CategoryDTO category, Meal meal) {
        if (category == null) {
            return null;
        }
        return Category
                .builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build();
    }


    private List<FoodItemDTO> mapFoodItemsToFoodItemsDTO(List<FoodItem> foodItems) {
        List<FoodItemDTO> foodItemDTOs = new ArrayList<>();
        for (FoodItem foodItem : foodItems) {
            FoodItemDTO foodItemDTO = mapFoodItemToFoodItemDTO(foodItem);
            foodItemDTOs.add(foodItemDTO);
        }
        return foodItemDTOs;
    }

    private FoodItemDTO mapFoodItemToFoodItemDTO(FoodItem foodItem) {
        return FoodItemDTO.builder()
                .id(foodItem.getId())
                .name(foodItem.getName())
                .description(foodItem.getDescription())
                .calories(foodItem.getCalories())
                .quantity(foodItem.getQuantity())
                .nutrients(foodItem.getNutrients())
                .category(mapCategoryToCategoryDTO(foodItem.getCategory()))
                .build();
    }

    private CategoryDTO mapCategoryToCategoryDTO(Category category) {
        if (category == null) {
            return null;
        }
        return CategoryDTO
                .builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build();
    }
}
