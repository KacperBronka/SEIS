export function checkRequestData_notEmpty(...data){
    return data.every(elem => elem != null)
}