import { All,Controller,Req,Res } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { Request,Response } from "express";

@Controller('core')
export class CoreController{
    constructor(private http: HttpService) {}

    @All('*path')   // Express 5 (NestJS 11) wajib wildcard bernama, bukan '*'
    async proxy(@Req() req:Request, @Res() res:Response){
        const base = process.env.CORE_SERVICE_URL;
        const path = req.url.replace(/^\/core/, '')
        const r = await firstValueFrom(
            this.http.request({
                method: req.method as any,
                url: `${base}${path}`,
                data: req.body,
                headers: { ...req.headers, host: undefined },
                validateStatus: () => true,
            }),
        );
        res.status(r.status).json(r.data);
    }
}