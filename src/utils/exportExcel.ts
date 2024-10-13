import { Workbook } from "exceljs";
import { Request, Response } from "express";

import { keyToTitleCase } from "@utils/helpers";

export default async function ExportExcel(
  excelData: { file_name: string; sheets: { sheetName: string; data: {}[] }[] },
  req: Request,
  res: Response
) {
  try {
    const workbook = new Workbook();

    for (let i = 0; i < excelData.sheets.length; i++) {
      const worksheet = workbook.addWorksheet(
        `${excelData.sheets[i].sheetName} (${excelData.sheets[i].data.length})`
      );
      let keys = excelData.sheets[i].data[0]
        ? Object.entries(excelData.sheets[i].data[0])
        : Object.entries(excelData.sheets[0].data[0]);
      let excelColumn = keys.map(([key]) => {
        return {
          header: keyToTitleCase(key),
          key: key,
          width: 25,
          height: 10,
        };
      });

      worksheet.columns = excelColumn;

      worksheet.addRows(excelData.sheets[i].data);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${excelData.file_name}"`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

    // return await workbook.xlsx
    //   .write(res)
    //   .then(() => {
    //     res.end();
    //     return {
    //       title: "Successful",
    //       content: `Please wait while the data is being downloaded`,
    //     };
    //   })
    //   .catch((err) => {
    //     throw err;
    //   });
  } catch (err) {
    throw err;
  }
}
