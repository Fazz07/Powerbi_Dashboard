  /**
   * Parses CSV data to extract the word value and formats large numbers.
   *
   * This function first checks if the CSV contains comma-separated values with a header.
   * If not, it assumes a simple two-line format where the first line is a header (e.g., "Returns")
   * and the second line is the word value (e.g., "$52342").
   * If the number is greater than or equal to 1000, it will format it using 'k', 'M', etc.
   *
   * @param csvData - String containing CSV formatted data
   * @returns Formatted word string (e.g. "$523k" or "$1.5M")
   */
  export function parseData(csvData: string): string {
    console.log('Parsing CSV data for a word...');
    
    // Trim and split the CSV data into non-empty lines.
    const lines = csvData.split("\n").map(line => line.trim()).filter(line => line !== "");
    
    // Fallback: If we have at least two lines, assume the second line is a word value.
    if (lines.length >= 2) {
      let value = lines[1];
      
      // Check if the value is a valid number (after removing non-numeric characters like '$')
      const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      
      // If it's a valid number, format it
      if (!isNaN(numericValue)) {
        value = formatNumber(numericValue);
      }
      
      console.log('Fallback: assuming second line is a word:', value);
      return value;
    }
    
    console.warn('Word not found in CSV data.');
    return "none";
  }

  /**
   * Formats numbers larger than 1000 with 'k', 'M', etc.
   * 
   * @param num - The numeric value to format.
   * @returns Formatted string (e.g. 1000 => '1k', 1000000 => '1M')
   */
  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'; // Format as millions
    }
    if (num >= 10000) {
      return (num / 1000).toFixed(1) + 'k'; // Format as thousands
    }
    return num.toString(); // No formatting for smaller numbers
  }
