import moment from "moment";
import "multer";


export const parseUrl = (url: string) => {
  const { protocol, hostname, port } = new URL(url);
  return {
    protocol: protocol.replace(":", ""), // Remove the colon (e.g., "http:")
    host: `${hostname}${port ? ":" + port : ""}`, // Combine hostname and port
  };
};

export const zeroPad = (num: number, places: number) => {
  return String(num).padStart(places, "0");
};

export const keyToTitleCase = (string: string) => {
  string = string
    .split("_")
    .filter((row) => row)
    .map((row) => {
      if (row.includes("id")) {
        return row.toUpperCase();
      }

      return row.charAt(0).toUpperCase() + row.substring(1).toLowerCase();
    })
    .join(" ");

  return string;
};

export const stringToArgs = (string: string | string[]) => {
  let sample = (<string>string).split(",").reduce((obj, property) => {
    obj[property] = true;
    return obj;
  }, {} as { [key: string]: boolean });

  if (string && sample) return sample;

  return undefined;
};

export const isValidDate = (date: any) => {
  if (moment(date).isValid()) {
    return date;
  } else {
    return moment();
  }
};

export function numberSeparator(currency: string | number, decimal?: number) {
  return parseFloat(currency?.toString())
    .toFixed(decimal ?? 2)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function convertStringToBoolean(inputObject: {
  [key: string]: string;
}): { [key: string]: boolean } | undefined {
  // if (Object.keys(inputObject).length === 0) {
  //   return undefined;
  // }

  const booleanObject: { [key: string]: boolean } = {};

  for (const key in inputObject) {
    if (inputObject.hasOwnProperty(key)) {
      booleanObject[key] = inputObject[key] === "true";
    }
  }

  return booleanObject;
}

export function removePrefix(str: string, toRemove: string) {
  const prefixes: string[] = [];

  // Generate prefixes based on the length of toRemove string
  for (let i = toRemove.length; i >= 0; i--) {
    prefixes.push(toRemove.slice(0, i));
  }

  // Iterate over each prefix
  for (const prefix of prefixes) {
    // Check if the string starts with the prefix (case-insensitive)
    if (str.toLowerCase().startsWith(prefix.toLowerCase())) {
      // Remove the prefix regardless of case
      str = str.substring(prefix.length);
      break; // Exit loop if a prefix is found and removed
    }
  }
  // Return the modified string
  return str;
}

export const getFieldnameObject = (
  filesArray: Express.Multer.File[],
  fieldName: string
): Express.Multer.File | undefined => {
  return filesArray.find((file) => file.fieldname === fieldName);
};

export const convertImageLink = (path: string) => {
  return process.env.NODE_ENV !== "production"
    ? `${process.env.NODE_APP_API_URL}/${path
        ?.replace(/\\/g, "/")
        .replace("public/", "")}`
    : `${process.env.NODE_APP_API_URL}/${path
        ?.replace(/\\/g, "/")
        .replace("dist/public/", "")}`;
};
