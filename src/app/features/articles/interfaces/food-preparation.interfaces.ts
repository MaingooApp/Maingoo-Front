// ─── Catálogos ────────────────────────────────────────────────────────────────

export interface FoodPreparationType {
  id: string;
  type: 'elaboration' | 'article';
}

export interface Utensil {
  id: string;
  name: string;
  enterpriseId?: string | null;
}

export interface Machinery {
  id: string;
  name: string;
  enterpriseId?: string | null;
}

// ─── Relaciones internas de FoodPreparation ───────────────────────────────────

export interface FoodPreparationIngredient {
  enterpriseProductId: string;
  measure: string;
  quantity: number;
  enterpriseProduct?: { id: string; productBase?: { name: string } };
}

export interface FoodPreparationSubPreparation {
  oldFoodPreparationId: string;
  measure: string;
  quantity: number;
  oldFoodPreparation?: { id: string; name: string };
}

// ─── Entidad principal ────────────────────────────────────────────────────────

export interface FoodPreparation {
  id: string;
  name: string;
  enterpriseId: string;
  typeId: string;
  steps?: string | null;
  type?: FoodPreparationType;
  ingredients?: FoodPreparationIngredient[];
  subPreparations?: FoodPreparationSubPreparation[];
  preparationUtensils?: { utensil: Utensil }[];
  preparationMachinery?: { machinery: Machinery }[];
  _count?: { ingredients: number; subPreparations: number };
  estimatedCost?: number;
}

// ─── DTOs (para creación / actualización) ────────────────────────────────────

export interface IngredientItemDto {
  enterpriseProductId: string;
  measure: string;
  quantity: number;
}

export interface SubPreparationItemDto {
  oldFoodPreparationId: string;
  measure: string;
  quantity: number;
}

export interface CreateFoodPreparationDto {
  typeId: string;
  name: string;
  steps?: string;
  ingredients?: IngredientItemDto[];
  subPreparations?: SubPreparationItemDto[];
  utensilIds?: string[];
  machineryIds?: string[];
}

export interface UpdateFoodPreparationDto {
  typeId?: string;
  name?: string;
  steps?: string;
  ingredients?: IngredientItemDto[];
  subPreparations?: SubPreparationItemDto[];
  utensilIds?: string[];
  machineryIds?: string[];
}
