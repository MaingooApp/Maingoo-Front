export const getCategoryStyle = (category: string | undefined | null): { [klass: string]: any } => {
	if (!category) return {};

	switch (category.toLowerCase()) {
		case 'frutas':
		case 'verduras':
			// Green
			return { backgroundColor: '#dcfce7', color: '#166534' };
		case 'carnes':
			// Red
			return { backgroundColor: '#fee2e2', color: '#991b1b' };
		case 'lacteos':
		case 'lácteos y huevos':
			// Blue
			return { backgroundColor: '#dbeafe', color: '#1e40af' };
		case 'bebidas':
			// Yellow/Orange
			return { backgroundColor: '#fef9c3', color: '#854d0e' };
		case 'limpieza':
			// Purple
			return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
		case 'charcutería':
		case 'charcuteria':
			// Pink/Rose
			return { backgroundColor: '#ffe4e6', color: '#881337' };
		case 'comidas preparadas':
			// Orange
			return { backgroundColor: '#ffedd5', color: '#9a3412' };
		case 'conservas':
			// Amber
			return { backgroundColor: '#fef3c7', color: '#92400e' };
		case 'despensa':
			// Stone/Warm Gray
			return { backgroundColor: '#e7e5e4', color: '#44403c' };
		case 'hielos':
			// Cyan
			return { backgroundColor: '#cffafe', color: '#155e75' };
		case 'material y equipamiento':
			// Slate
			return { backgroundColor: '#f1f5f9', color: '#334155' };
		case 'panadería':
		case 'panaderia':
			// Light Orange (Wheat)
			return { backgroundColor: '#ffedd5', color: '#9a3412' };
		case 'pastelería y confitería':
		case 'pasteleria y confiteria':
			// Pink
			return { backgroundColor: '#fce7f3', color: '#9d174d' };
		case 'pescados y mariscos':
			// Sky Blue
			return { backgroundColor: '#e0f2fe', color: '#075985' };
		case 'quesos':
			// Yellow
			return { backgroundColor: '#fefce8', color: '#ca8a04' };
		case 'salsas y aliños':
		case 'salsas y alinos':
			// Lime
			return { backgroundColor: '#ecfccb', color: '#3f6212' };
		case 'otros':
		default:
			// Gray
			return { backgroundColor: '#f3f4f6', color: '#374151' };
	}
};
