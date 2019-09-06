/**
 * @file Transform COPYBOOK (COBOL) to JSON.
 * @author @douglaspands
 * @since 2017-10-25
 * @adapted 2019-09-05
 */

 // Modules
 const fs = require('fs');
 const _ = require('lodash');
 
 class CopyBook2Json {

    constructor(fileName) {
        this.inFileName = fileName;
        this.outFileName = '';
        this.output = '';
    };
    
    process() {
        console.log('Start processing');
        // Get file
        const fileEnt = ((fs.readFileSync(this.inFileName, 'utf8')));
        // Processing
        const codeLines = this.book2list(fileEnt);
        // Generate Json
        const jsonCode = this.copybook2json(codeLines);
        // Stringify
        const stringified = JSON.stringify(jsonCode.data, null, 4);

        // Save output
        this.outFileName = this.inFileName.replace((/(\.)(.)+/g), '') + '.json';
        this.output = stringified;
        fs.writeFileSync( this.outFileName, stringified, 'utf8');

        console.log('Finish processing');
        return (stringified);
    };

    /**
     * Generates list of lines with params.
     * @param {string} copybook COPYBOOK COBOL.
     * @return {array} Param list of COPYBOOK.
     */
    book2list(copybook) {
        var linhasBook = (_
            .reduce(copybook.split('\r\n'), function (acum, l) {
                if (l.substr(6, 1) !== '*' && !(/^( )+$/g).test(l)) {
                    acum.push(l.substr(6, _.size(l) - 6));
                }
                return acum;
            }, [])).join('\r\n');
        var retVal = _.reduce(linhasBook.split('.'), function (acum, o, key) {
            var regex = new RegExp('(\r\n)(\-)( )+(\')', 'g');
            var result = o.replace(regex, '');
            regex = new RegExp('(\r\n)+', 'g');
            result = result.replace(regex, '');
            regex = new RegExp('(\')(.+)(\')', 'g');
            var defaultValue = result.match(regex);
            if (defaultValue) {
                result = result.replace(regex, '***');
            }
            regex = new RegExp('( )+', 'g');
            result = result.replace(regex, ' ');
            result = _.trimRight( _.trimLeft(result));
            result = result.split(' ');
            if (defaultValue) {
                regex = new RegExp('[\*]{3}', 'g');
                result = _.map(result, function (o, key) {
                    return o.replace(regex, defaultValue);
                });
            }
            if (_.size(result[0]) > 0) {
                acum.push(result);
            }
            return acum;
        }, []);
        return retVal;
    };

    /**
     * Convert from COPYBOOK to JSON.
     * @param {array} book COPYBOOK transformed into array.
     * @param {number} point Pointer from beginning.
     * @returns {array} Fields list in JSON.
     */
    copybook2json(book, point) {
        var startPoint = (point === undefined || point === 0) ? 0 : point + 1;
        var lastPosition = point >> 0;
        var index = 0, lengthBook = book.length, i = 0, j = 0, k = 0;
        var retVal = [];
        while (index < lengthBook) {
            var fieldName = _.snakeCase(book[index][1]);
            var fieldNameMainframe = book[index][1];
            var item, itemsGroup = [], occurs = [], newGroup = {}, objNew = {};
            switch (true) {
                // Tratamento de redefinição com item de grupo
                case (_.includes(book[index], 'REDEFINES') && !_.includes(book[index], 'PIC')):
                    k = (index === 0) ? 1 : index + 1;
                    itemsGroup = [];
                    item = parseInt(book[index][0]);
                    while (k < lengthBook && parseInt(book[k][0]) > item) {
                        itemsGroup.push(book[k]);
                        k++;
                    };
                    newGroup = copybook2json(itemsGroup, redefines(objNew, book[index][3]));
                    objNew['name'] = fieldName;
                    objNew['copybook_name'] = fieldNameMainframe;
                    objNew['type'] = 'group';
                    objNew['redefines'] = _.snakeCase(book[index][3]);
                    objNew['data'] = newGroup['data'];
                    objNew['start'] = newGroup['start'];
                    objNew['length'] = newGroup['length'];
                    lastPosition = (newGroup['length']);
                    index = k - 1;
                    break;
                // Redefines common level 
                case (_.includes(book[index], 'REDEFINES') && _.includes(book[index], 'PIC')):
                    objNew['name'] = fieldName;
                    objNew['copybook_name'] = fieldNameMainframe;
                    objNew['type'] = this.getType(book[index][5], _.find(['COMP', 'COMP-3'], function (item) { return item === book[index][4] }));
                    objNew['redefines'] = _.snakeCase(book[index][3]);
                    objNew['start'] = (redefines(objNew, book[index][3]) + 1);
                    objNew['length'] = this.picture(book[index][5], _.find(['COMP', 'COMP-3'], function (item) { return item === book[index][4] }));
                    break;
                // Picture
                case _.includes(book[index], 'PIC'):
                    objNew['name'] = fieldName;
                    objNew['copybook_name'] = fieldNameMainframe;
                    objNew['type'] = this.getType(book[index][3], _.find(['COMP', 'COMP-3'], function (item) { return item === book[index][4] }));
                    objNew['start'] = (lastPosition === 0) ? 0 : lastPosition + 1;
                    objNew['length'] = this.picture(book[index][3], _.find(['COMP', 'COMP-3'], function (item) { return item === book[index][4] }));
                    lastPosition += (lastPosition === 0) ? (objNew['length'] - 1) : objNew['length'];
                    break;
                // Ocurrences
                case _.includes(book[index], 'OCCURS'):
                    var occursLine = book[index];
                    var repeat = parseInt(book[index][3]);
                    j = index + 1;
                    occurs = [];
                    item = parseInt(book[index][0]);
                    while (j < lengthBook && parseInt(book[j][0]) > item) {
                        occurs.push(book[j]);
                        j++;
                    };
                    var newList = [], endOccurs = lastPosition;
                    for (i = 0; i < repeat; i++) {
                        var newGroup = copybook2json(occurs, endOccurs);
                        newList.push(newGroup['data']);
                        endOccurs = (newGroup['length']);
                    }
                    objNew['name'] = fieldName;
                    objNew['copybook_name'] = fieldNameMainframe;
                    objNew['type'] = 'list';
                    objNew['occurs'] = parseInt(occursLine[occursLine.indexOf('OCCURS') + 1], 10);
                    objNew['data'] = newList;
                    objNew['start'] = (lastPosition === 0) ? 0 : lastPosition + 1;
                    objNew['length'] = endOccurs;
                    lastPosition = endOccurs;
                    index = j - 1;
                    break;
                // Group list
                case (book[index][0] !== '88' && book[index][2] === undefined):
                    k = (index === 0) ? 1 : index + 1;
                    itemsGroup = [];
                    item = parseInt(book[index][0]);
                    while (k < lengthBook && parseInt(book[k][0]) > item) {
                        itemsGroup.push(book[k]);
                        k++;
                    };
                    newGroup = this.copybook2json(itemsGroup, lastPosition);
                    objNew['name'] = fieldName;
                    objNew['copybook_name'] = fieldNameMainframe;
                    objNew['type'] = 'group';
                    objNew['data'] = newGroup['data'];
                    objNew['start'] = newGroup['start'];
                    objNew['length'] = newGroup['length'];
                    lastPosition = (newGroup['length']);
                    index = k - 1;
                    break;
                default:
                    break;
            };
            if (!_.isEmpty(objNew)) {
                retVal.push(objNew);
            }
            index++;
        };
        return { data: retVal, start: startPoint, length: lastPosition };
    };

    /**
     * Calculates picture lenght.
     * @param {string} pic PIC from COPYBOOK.
     * @param {string} type Type of PIC (COMP, COMP-3, etc...)
     * @return {number} Size
     */
    picture(pic, type) {
        var tam = _.map(pic.split('V'), function (n) {
            if (/\(/g.test(n)) return parseInt(n.replace(/(S?9\(|X\(|\)|\()/g, ''))
            else return n.length;
        });
        var result = 0;
        _.forEach(tam, function (c) { result += c });
        switch (type) {
            case 'COMP':
                if (result < 5) result = 2;
                else result = 4;
                break;
            case 'COMP-3':
                result = Math.floor(result / 2) + 1;
                break;
            default:
                break;
        }
        return result;
    };

    /**
     * Variables type.
     * @param {string} pic PIC from COPYBOOK.
     * @param {string} type Type of PIC (COMP, COMP-3, etc...)
     * @return {string} Type.
     */
    getType(pic, type) {
        if (_.includes(['COMP', 'COMP-3'], type)) {
            return 'binary';
        } else if ((/9/g).test(pic)) {
            return 'number';
        } else {
            return 'string';
        }
    };

    /**
     * Search same name space/variable/redefines.
     * @param {object} objectCopybook Object in COPYBOOK.
     * @param {string} fieldNameMainframe Variable in COPYBOOK.
     * @return {number} Initial position.
     */
    redefines(objectCopybook, fieldNameMainframe) {
        var pos = -1;
        for (var prop in objectCopybook) {
            if (_.isObjectLike(objectCopybook[prop])) {
                if (objectCopybook[prop]['copybook_name'] === fieldNameMainframe) {
                    pos = objectCopybook[prop]['start'];
                } else {
                    if (objectCopybook[prop]['data']) {
                        if (_.isArray(objectCopybook[prop]['data'])) {
                            var temp;
                            _.forEach(objectCopybook[prop]['data'], function (o) {
                                temp = redefines(o, fieldNameMainframe);
                                if (temp > -1) {
                                    pos = temp;
                                    return false;
                                }
                            });
                        } else {
                            var temp = redefines(objectCopybook[prop]['data'], fieldNameMainframe);
                            if (temp > -1) {
                                pos = temp;
                            }
                        }
                    }
                }
            }
        }
        return (pos - 1);
    };
 }

 module.exports = CopyBook2Json;