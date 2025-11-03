#!/usr/bin/env ts-node
import 'dotenv/config';
declare global {
    function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
