import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { ProductListComponent } from '@features/products/components/product-list/product-list.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { getCategoryStyle } from '@app/shared/helpers/category-colors.helper';

interface CategoryNode {
	name: string;
	children: CategoryNode[];
	products: Product[];
	level: number;
}

@Component({
	selector: 'app-category-detail',
	standalone: true,
	imports: [CommonModule, ProductListComponent, IconComponent],
	templateUrl: './category-detail.component.html'
})
export class CategoryDetailComponent implements OnChanges {
	@Input() categoryName: string | null = null;
	@Input() products: Product[] = [];
	@Input() selectedProduct: Product | null = null;
	@Output() close = new EventEmitter<void>();
	@Output() selectProduct = new EventEmitter<Product>();

	categoryTree: CategoryNode[] = [];

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['products'] || changes['categoryName']) {
			this.buildTree();
		}
	}

	private buildTree() {
		const rootNodes: CategoryNode[] = [];
		const categoryMap = new Map<string, CategoryNode>();

		// Sort products by path length to ensure parents are processed effectively, 
		// though we build dynamically so just iterating is fine if logic is robust.
		this.products.forEach(product => {
			const pathStr = product.category?.path || (product.category?.name ? product.category.name : 'Otros');
			// Remove the root category from the path if it matches categoryName to avoid top-level redundancy
			// Assuming path is "Root > Child > Grandchild"
			let parts = pathStr.split(' > ').map(p => p.trim());

			// If the first part is the current categoryName, we can optionally skip it to show subcategories directly
			// But user asked for "superior a inferior", so let's keep hierarchy clean.
			// If we are in "Bebidas", and path is "Bebidas > Agua", we want "Agua" as a node.
			if (this.categoryName && parts[0].toLowerCase() === this.categoryName.toLowerCase()) {
				parts = parts.slice(1);
			}

			// If no parts left (product is directly in root), put in a "General" or direct bucket?
			// Or just treat as root level products.

			let currentLevelNodes = rootNodes;
			let currentPath = '';

			parts.forEach((part, index) => {
				const isLast = index === parts.length - 1;
				// For non-leaf or intermediate nodes

				// Find existing node at this level
				let node = currentLevelNodes.find(n => n.name === part);

				if (!node) {
					node = {
						name: part,
						children: [],
						products: [],
						level: index
					};
					currentLevelNodes.push(node);
					// Sort nodes alphabetically
					currentLevelNodes.sort((a, b) => a.name.localeCompare(b.name));
				}

				if (isLast) {
					node.products.push(product);
					node.products.sort((a, b) => a.name.localeCompare(b.name));
				}

				currentLevelNodes = node.children;
			});

			// If parts was empty (direct child of root), add to a specific collection?
			// With the logic above, if parts is empty, it doesn't get added anywhere.
			// We should handle direct root products.
			if (parts.length === 0) {
				// Create a pseudo node or add to a "Directos" list? 
				// Let's look for a node named "General" or empty string?
				// Or just add to a separate list of direct products.
				// For now let's add to a special node "General" if mixed, or just handle at root.
				let generalNode = rootNodes.find(n => n.name === 'General');
				if (!generalNode) {
					generalNode = { name: 'General', children: [], products: [], level: 0 };
					rootNodes.push(generalNode); // push to start?
				}
				generalNode.products.push(product);
			}
		});

		this.categoryTree = rootNodes;
	}

	getCategoryStyle(name: string | null) {
		return getCategoryStyle(name);
	}

	onClose() {
		this.close.emit();
	}

	onSelectProduct(product: Product) {
		this.selectProduct.emit(product);
	}
}
