// Grid layout utilities for form builder

// Convert fields to a grid layout
export function calculateLayout(fields, columns = 12) {
    // Sort fields by y position first, then x
    const sortedFields = [...fields].sort((a, b) => {
      const aY = a.layout?.y || 0;
      const bY = b.layout?.y || 0;
      
      // If y positions are the same, sort by x
      if (aY === bY) {
        const aX = a.layout?.x || 0;
        const bX = b.layout?.x || 0;
        return aX - bX;
      }
      
      return aY - bY;
    });
    
    // Track occupied cells in the grid
    const grid = {};
    
    // Process each field to find its position
    return sortedFields.map((field, index) => {
      // Get existing layout or create default
      const fieldLayout = field.layout || {};
      
      // Default width to colSpan or 12 (full width)
      const width = field.colSpan || 12;
      
      // Default height based on field type
      const height = field.type === 'textarea' ? 3 : 2;
      
      // Try to use existing position if valid
      let x = fieldLayout.x !== undefined ? fieldLayout.x : 0;
      let y = fieldLayout.y !== undefined ? fieldLayout.y : 0;
      
      // If position is occupied, find a new one
      let positionFound = false;
      
      while (!positionFound) {
        // Check if position is valid
        let valid = true;
        
        // Check each cell the field would occupy
        for (let dx = 0; dx < width; dx++) {
          for (let dy = 0; dy < height; dy++) {
            const cellKey = `${x + dx},${y + dy}`;
            if (grid[cellKey]) {
              valid = false;
              break;
            }
          }
          if (!valid) break;
        }
        
        if (valid) {
          positionFound = true;
          
          // Mark cells as occupied
          for (let dx = 0; dx < width; dx++) {
            for (let dy = 0; dy < height; dy++) {
              const cellKey = `${x + dx},${y + dy}`;
              grid[cellKey] = field.id;
            }
          }
        } else {
          // Try next position
          x++;
          
          // If reached end of row, go to next row
          if (x + width > columns) {
            x = 0;
            y++;
          }
        }
      }
      
      // Return field with updated layout
      return {
        ...field,
        layout: {
          x,
          y,
          w: width,
          h: height
        }
      };
    });
  }
  
  // Convert column span to percentage width
  export function colSpanToWidth(colSpan, columns = 12) {
    return (colSpan / columns * 100) + '%';
  }
  
  // Snap a value to a grid
  export function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
  }
  
  // Calculate which column a position belongs to
  export function positionToColumn(x, containerWidth, columns = 12) {
    const columnWidth = containerWidth / columns;
    return Math.min(columns - 1, Math.max(0, Math.floor(x / columnWidth)));
  }
  
  // Get field width based on colSpan
  export function getWidthStyles(field, columns = 12) {
    const colSpan = field.colSpan || 12;
    return {
      width: colSpanToWidth(colSpan, columns)
    };
  }