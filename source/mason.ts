import { MasonRenderer } from "./mason-renderer";
import { MasonDefaultPacker } from "./mason-default-packer";
import { MasonPacker } from "./mason-packer";
import { MasonCoord } from "./mason-coord";

export class MasonOptions {
  renderer: MasonRenderer;
  containerWidth: number;
  columns: number = 12;
  threshold: number = 0;
  packer?: MasonPacker;
}

export class Mason {
  containerWidth: number;
  columnBottoms: number[];
  columns = 12;
  renderer: MasonRenderer;
  packer: MasonPacker;

  // This is the wiggle room Mason has when choosing a column for a brick
  // When starting on the left, Mason will only consider a column choose as a better fit
  // if it is better by this amount or more. This prevents bricks from being placed to the
  threshold = 40;

  constructor(opts: MasonOptions);
  constructor(
    rendererOrOptions: MasonRenderer | MasonOptions,
    containerWidth?: number,
    columns: number = 12,
    threshold: number = 0
  ) {
    this.columnBottoms = [];

    if (rendererOrOptions["renderer"]) {
      let opts = <MasonOptions>rendererOrOptions;
      this.renderer = opts.renderer;
      this.containerWidth = opts.containerWidth;
      this.columns = opts.columns;
      this.threshold = opts.threshold;
      this.packer = opts.packer || new MasonDefaultPacker();
    } else {
      this.renderer = <MasonRenderer>rendererOrOptions;
      this.containerWidth = containerWidth;
      this.columns = columns;
      this.threshold = threshold;
      this.packer = new MasonDefaultPacker();
    }

    while (this.columnBottoms.length < this.columns) {
      this.columnBottoms.push(0);
    }

    this.renderer.setColumns(columns);
  }

  private findBestColumn(
    requiredColumns: number,
    element: any,
    elementIndex: number
  ): MasonCoord {
    return this.packer.findBestColumn(
      requiredColumns,
      element,
      elementIndex,
      this.columnBottoms,
      this.threshold
    );
  }

  /**
   * Takes a list of elements and returns the new coords for each one. This does not reposition anything.
   * You might use this if you want to handle how and when things get repositioned.
   *
   * See layout() if you want everything position automatically.
   *
   * @param elements
   * @returns {coords: MasonCoord[], totalHeight: number}
   */
  fit(elements: any[]): { coords: MasonCoord[]; totalHeight: number } {
    let coordsList: MasonCoord[] = [];
    let totalHeight = 0;

    elements.forEach((element, idx) => {
      let elementWidth = this.renderer.getElementWidth(element);
      let elementHeight = this.renderer.getElementHeight(element);

      let cols = Math.round(elementWidth / this.containerWidth * this.columns);
      // can't be bigger than 'all' columns
      if (cols > this.columns) {
        cols = this.columns;
      }

      let bestFit: MasonCoord = this.findBestColumn(cols, element, idx);

      // update the column bottoms for all the columns this tile crosses when positioned at the best
      // location

      let startCol = bestFit.xColumns;
      let endCol = startCol + cols;

      for (let i = startCol; i < endCol; i++) {
        this.columnBottoms[i] = bestFit.yUnits + elementHeight;
      }

      // this is a tuple where x is the column index and yPos is the pixel coord to position at.
      coordsList.push(bestFit);

      // update the total height
      totalHeight = Math.max(totalHeight, elementHeight + bestFit.yUnits);
    });

    // return the list of coordinates for each tile
    return { coords: coordsList, totalHeight: totalHeight };
  }

  /**
   * This will take the list of elements, find their new locations and then use the MasonRenderer
   * to reposition all the bricks into their new home.
   * @param elements
   * @returns the height that the container must now be to hold the items.
   */
  layout(elements: any[]): number {
    let layoutResult = this.fit(elements);
    layoutResult.coords.forEach((coord: MasonCoord) => {
      // apply the calculated position for each brick however you want. In this case
      // we are just setting the CSS position. Animation will be provided via CSS
      this.renderer.setPosition(coord.element, coord.xColumns, coord.yUnits);
    });

    return layoutResult.totalHeight;
  }
}
