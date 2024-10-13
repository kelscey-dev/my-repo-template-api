import { Request, Response, NextFunction } from "express";
import { convertImageLink } from "@utils/helpers";

function processFileUploads(dynamicProperties: string[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    try {
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => {
          const match = file.fieldname.match(/(\w+)\[(\d+)\]\[(\w+)\]/);

          if (match) {
            const fieldName = match[1];
            const index = parseInt(match[2]);
            const property = match[3];
            req.body[fieldName] = req.body[fieldName] || [];
            req.body[fieldName][index] = req.body[fieldName][index] || {};

            if (dynamicProperties.includes(property)) {
              req.body[fieldName][index][property] = convertImageLink(
                file?.path
              );
            }
          } else {
            req.body[file.fieldname] = convertImageLink(file?.path);
          }
        });
      }
      next();
    } catch (err) {
      throw err;
    }
  };
}

export default processFileUploads;
