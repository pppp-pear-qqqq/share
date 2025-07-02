export class Ajax {
    _url;
    _query;
    _req;
    _ret_type;
    constructor(arg) {
        if (arg instanceof HTMLFormElement) {
            if (!arg.checkValidity())
                throw new Error('フォームの制約が満たされていません');
            this._url = arg.action;
            if (arg.elements.length > 0)
                switch (arg.method) {
                    case 'get':
                        {
                            this._query = new URLSearchParams(new FormData(arg));
                        }
                        break;
                    case 'post': {
                        if (!['form', 'json'].includes(arg.dataset.encode))
                            throw new Error('エンコード形式が指定されていません');
                        this.post(arg, arg.dataset.encode);
                        break;
                    }
                }
        }
        else {
            this._url = arg;
        }
        this._req = {};
    }
    url(url) {
        this._url = url;
        return this;
    }
    ret_type(ret_type) {
        this._ret_type = ret_type;
        return this;
    }
    query(data) {
        this._query = new URLSearchParams(data);
        return this;
    }
    body(data, encode) {
        if (data instanceof FormData) {
            this._req.body = new URLSearchParams(data);
        }
        else
            switch (encode) {
                case 'form':
                    if (data instanceof HTMLFormElement) {
                        this._req.body = new URLSearchParams(new FormData(data));
                    }
                    else {
                        this._req.body = new URLSearchParams(Object.entries(data).filter(([_, value]) => value != null).map(([k, v]) => [k, String(v)]));
                    }
                    break;
                case 'json':
                    if (data instanceof HTMLFormElement) {
                        let buf = {};
                        for (const e of data.elements)
                            if (e.name !== null && e.value !== '')
                                buf[e.name] = (() => {
                                    if (e instanceof HTMLInputElement)
                                        switch (e.type) {
                                            case 'number': return Number(e.value);
                                            default: return e.value;
                                        }
                                    else {
                                        return e.value;
                                    }
                                })();
                        this._req.body = JSON.stringify(buf);
                        this._req.headers = { 'Content-Type': 'application/json' };
                    }
                    else {
                        this._req.body = JSON.stringify(data);
                        this._req.headers = { 'Content-Type': 'application/json' };
                    }
                    break;
            }
        return this;
    }
    method(method) {
        this._req.method = method;
        return this;
    }
    get(data) {
        this.query(data);
        this.method('GET');
        return this;
    }
    post(data, encode = 'json') {
        this.body(data, encode);
        this.method('POST');
        return this;
    }
    send(ret_type) {
        if (!this._url)
            throw new Error("URL未設定");
        return fetch(this._query ? `${this._url}?${this._query.toString()}` : this._url, this._req)
            .then(r => {
            if (r.ok) {
                switch (ret_type ? ret_type : this._ret_type) {
                    case 'arrayBuffer': return r.arrayBuffer();
                    case 'blob': return r.blob();
                    case 'bytes': return r.bytes();
                    case 'formData': return r.formData();
                    case 'json': return r.json();
                    case 'text': return r.text();
                    default: return r;
                }
            }
            else
                return r.text().then(e => {
                    console.error(e);
                    throw new Error(e);
                });
        });
    }
}
