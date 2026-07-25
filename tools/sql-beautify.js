window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const dialect = options.dialect || 'generic';
        const indentStr = options.indent !== false ? '  ' : '    ';
        const upperCase = options.uppercase !== false;
        const lowerCase = options.lowercase || false;
        const wrap = options.wrap !== false;
        const highlight = options.highlight || false;

        if (!text.trim()) {
            showError && showError('Empty SQL input');
            return [];
        }

        setStatus && setStatus('Processing SQL...');

        const keywords = this._getKeywords(dialect);
        const keywordSet = new Set(keywords.map(k => upperCase ? k.toUpperCase() : (lowerCase ? k.toLowerCase() : k)));

        let sql = text.trim();
        if (!upperCase && !lowerCase) {
            sql = sql.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi'), (m) => m.toUpperCase());
        } else if (upperCase) {
            sql = sql.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi'), (m) => m.toUpperCase());
        } else if (lowerCase) {
            sql = sql.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi'), (m) => m.toLowerCase());
        }

        const lines = sql.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
        const output = [];

        lines.forEach((line, idx) => {
            if (idx > 0) output.push('');
            output.push(this._formatLine(line, 0, indentStr, wrap, keywordSet));
        });

        const resultText = highlight ? this._syntaxHighlight(output.join('\n')) : output.join('\n');
        const result = { name: 'sql-beautified.sql', text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('SQL beautified', 'success');
        return [result];
    },

    _getKeywords(dialect) {
        const common = ['SELECT','FROM','WHERE','AND','OR','NOT','NULL','IS','IN','LIKE','BETWEEN','AS','ON','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','UNION','ALL','DISTINCT','CASE','WHEN','THEN','ELSE','END','EXISTS','COUNT','SUM','AVG','MIN','MAX','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','INDEX','ADD','CONSTRAINT','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','CHECK','DEFAULT','IF','ELSE','FOR','WHILE','DO','BEGIN','END','DECLARE','CURSOR','OPEN','FETCH','CLOSE','COMMIT','ROLLBACK','TRANSACTION','GRANT','REVOKE','USE','DATABASE','SCHEMA','VIEW','TRIGGER','PROCEDURE','FUNCTION','RETURN','CALL','EXEC','EXECUTE','WITH','RECURSIVE','OVER','PARTITION','WINDOW','RANK','DENSE_RANK','ROW_NUMBER','LAG','LEAD','FIRST_VALUE','LAST_VALUE','NTH_VALUE','PERCENT_RANK','CUME_DIST','NTILE','CAST','CONVERT','TRY_CAST','TRY_CONVERT','COALESCE','NULLIF','ISNULL','IFNULL','NVL','IIF','DECODE','MERGE','WHEN','MATCHED','THEN','UPDATE','DELETE','INSERT','PIVOT','UNPIVOT','APPLY','CROSS','OUTER','LATERAL','TABLESAMPLE','SYSTEM','BERNOULLI','TOP','PERCENT','WITH','TIES','OFFSET','FETCH','NEXT','ROW','ROWS','ONLY','FOR','XML','PATH','AUTO','RAW','EXPLICIT','BINARY','VARBINARY','IMAGE','CHAR','VARCHAR','TEXT','NCHAR','NVARCHAR','NTEXT','DATE','TIME','DATETIME','DATETIME2','SMALLDATETIME','DATETIMEOFFSET','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND','MILLISECOND','MICROSECOND','NANOSECOND','GETDATE','SYSDATETIME','GETUTCDATE','DATEADD','DATEDIFF','DATENAME','DATEPART','CONVERT','FORMAT','TRY_CONVERT','TRY_CAST','PARSE','TRY_PARSE','ISDATE','SWITCHOFFSET','TODATETIMEOFFSET','DATE_TRUNC','EXTRACT','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','LOCALTIME','LOCALTIMESTAMP','NOW','CURDATE','CURTIME','CURRENT_USER','SESSION_USER','SYSTEM_USER','USER','CURRENT_CATALOG','CURRENT_SCHEMA','CURRENT_PATH','SOME','ANY','ARRAY','STRUCT','MAP','UNNEST','LATERAL','CROSS','OUTER','INNER','FULL','LEFT','RIGHT','NATURAL','SEMI','ANTI','WINDOW','OVER','PARTITION','ORDER','ROWS','RANGE','PRECEDING','FOLLOWING','CURRENT','EXCLUDE','TIES','GROUPING','SETS','CUBE','ROLLUP','CUBE','ROLLUP','GRAND','TOTAL','MARGINAL','PERCENTILE_CONT','PERCENTILE_DISC','LISTAGG','STRING_AGG','ARRAY_AGG','MULTISET','COLLECT','FUSION','INTERSECTION','EXCEPT','INTERSECT','MINUS','DIVIDE','MOD','POWER','SQRT','ABS','CEIL','CEILING','FLOOR','ROUND','TRUNC','SIGN','MOD','RAND','RANDOM','PI','EXP','LN','LOG','LOG10','LOG2','SIN','COS','TAN','ASIN','ACOS','ATAN','ATAN2','DEGREES','RADIANS','COT','SINH','COSH','TANH','ASINH','ACOSH','ATANH','BITAND','BITOR','BITXOR','BITNOT','GETBIT','SETBIT','COUNT','SUM','AVG','MIN','MAX','STDDEV','VARIANCE','MEDIAN','MODE','PERCENTILE','APPROX_COUNT_DISTINCT','APPROX_PERCENTILE','APPROX_MEDIAN','APPROX_TOP_K','CORR','COVAR_POP','COVAR_SAMP','REGR_SLOPE','REGR_INTERCEPT','REGR_COUNT','REGR_R2','REGR_AVGX','REGR_AVGY','REGR_SXX','REGR_SXY','REGR_SYY','VAR_POP','VAR_SAMP','STDDEV_POP','STDDEV_SAMP','SEMI','ANTI','LATERAL','TABLESAMPLE','BERNOULLI','SYSTEM','REPEATABLE'];
        return common;
    },

    _formatLine(sql, depth, indentStr, wrap, keywordSet) {
        const tokens = this._tokenize(sql);
        const lines = [];
        let currentLine = '';
        const maxLineLen = 120;

        tokens.forEach((token, idx) => {
            if (token.type === 'keyword' || token.type === 'separator') {
                if (token.value === ',' && wrap) {
                    currentLine += ',\n' + indentStr.repeat(depth + 1);
                } else if (['FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','SET','VALUES','INTO','TABLE'].includes(token.value.toUpperCase()) && currentLine.trim()) {
                    currentLine += '\n' + token.value + ' ';
                } else {
                    currentLine += token.value + ' ';
                }
            } else {
                currentLine += token.value + ' ';
            }

            if (wrap && currentLine.length > maxLineLen && token.type === 'separator') {
                lines.push(currentLine.trim());
                currentLine = indentStr.repeat(depth + 1);
            }
        });

        if (currentLine.trim()) lines.push(currentLine.trim());
        return lines.join('\n');
    },

    _tokenize(sql) {
        const tokens = [];
        const keywordPattern = /\b(SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|EXISTS|COUNT|SUM|AVG|MIN|MAX|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|ADD|CONSTRAINT|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT)\b/gi;
        let lastIndex = 0;
        let match;

        while ((match = keywordPattern.exec(sql)) !== null) {
            if (match.index > lastIndex) {
                tokens.push({ type: 'value', value: sql.slice(lastIndex, match.index) });
            }
            tokens.push({ type: 'keyword', value: match[0] });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < sql.length) {
            tokens.push({ type: 'value', value: sql.slice(lastIndex) });
        }

        return tokens.length ? tokens : [{ type: 'value', value: sql }];
    },

    _syntaxHighlight(sql) {
        const keywords = this._getKeywords('generic');
        const escaped = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span style="color:#a61717;font-weight:bold;">$1</span>');
    }
};
