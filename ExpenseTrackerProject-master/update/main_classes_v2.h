//---------------------------------------------------------------------
//----main_classes_v2.h
//----Author: Jconstan
//-----extended main_classes.h to be able to support both Cash and 
//-----Credit card expenses
//----------------------------------------------------------------------


#ifndef __AUXILLARY
#include "auxillary.h"
#define __AUXILLARY 
#endif


using namespace std;

//note 1.1

/////////////////////////////////////////////////////////////////////////////////////////
//money class Money, since it will not support other currencies yet...
//addition overload, for convenience
//members made private for proper data encapsulation of the Money class
//double not good, as some accuracy in addition is lost... unfortunately, it is very tedious to fix this as this was considered double from UI downto primitive class
//temporary fix is to just set the precision when printing...
/////////////////////////////////////////////////////////////////////////////////////////////

class Money{
	string currency;
    double value;
public:
    Money(const string ="INR", const double val=0):currency("INR"), value(val) {};
    Money operator+(const Money o);
	Money operator-(const Money o);
	
	const string getCurrency() const { return currency; } 
	const double getValue() const { return value; }
    void printInr();
};

/////////////////////////////////////////////////////////////////////////////////////////////
//note 1.2
//Expenditure class as a container for a single expense with time data
//not really sure if making the elements private is needed - just for proper encapsulation
//can ensure no stray method will modify this element
///////////////////////////////////////////////////////////////////////////////////////////////

class Expenditure{

protected:
    Money price;
    string description;
    ExpTime etime;
	
public:
	//constructor for real time user input
    Expenditure(const string curr, const double val, const string dc);  
	
	//constructor variation, used for loading from csv file
	Expenditure(const string date = "00/00/0000", const string time = "00/00/00", const string wday = "Sunday", const string curr="INR", 
		const double val=0, const string dc="none"):price(curr,val),description(dc),etime(date,time,wday){} 	
	
	const Money getPrice() const {return price;}
    const string getDesc() const {return description;}
    const ExpTime getTime() const {return etime;}
	
	//overloaded/extended functions, to ease interface of main and inherited class to ExpVector Methods
	virtual void printExpenditure();
	virtual string getCsvToString();                              //print expenditure to string in csv format
	virtual void accumulateMoney(Money money[3]);			   	  //accumulate money value to array
	virtual void getMoney(Money money[3]);			              //get money value to array
	virtual void printMoney(Money money[3]);			          //print money related data of array
};


///////////////////////////////////////////////////////////
////added feature, a class with credit card information 
////inherits from Expenditure
////main assumption is same currency for all money members 
////adds initial cash downpayment and remaining credit balance
///////////////////////////////////////////////////////////
class CreditExpenditure : public Expenditure{
	Money cashPayment;
	Money creditBalance;
public:
	//constructor for real time user input
	CreditExpenditure(const string curr, const double val, const string dc, const double cpay);
	
	//constructor variation, used for loading from csv file
	CreditExpenditure(const string date = "00/00/0000", const string time = "00/00/00", const string wday = "Sunday", 
		const string curr="INR", const double val=0, const string dc="none", const double cpay=0, const double cbalance=0):
		Expenditure(date,time,wday,curr,val,dc),cashPayment(curr,cpay),creditBalance(curr,cbalance){}
	
	
	//extended base class functions
	virtual void printExpenditure();
	virtual string getCsvToString();                    //store to string in csv format 
	virtual void accumulateMoney(Money money[3]);	    //accumulate money value to array
	virtual void getMoney(Money money[3]);			    //get money value to array
	virtual void printMoney(Money money[3]);			//print money related data of array
};



///////////////////////////////////////////////////////////////////////////////////////////////
//Use Vector from STL as container for the expense database class
//Use vector of *Expenditure, such that it can contain either Expenditure or CreditExpenditure
///////////////////////////////////////////////////////////////////////////////////////////////

class ExpVector{
    vector<Expenditure*> vecexp;
	void emptyExcept(){ if(vecexp.empty()) throw runtime_error("no expense entries on the Database!!"); }   //check if empty, throw exception
public:	
	void addEntry(const string date, const string time, const string wday, const string curr,               //for Expenditure, include time info
		const double val, const string dc);                                                                  //only loadVctr can call this  
	void addEntry(const string date, const string time, const string wday, const string curr, 				   
		const double val, const string dc, const double cpay, const double cbalance);                          //for CreditExpenditure, include time info
	
	
    ExpVector(){} 													                   //calls default constructor, empty vector
    void addEntry(const string curr, const double, const string dc);                    //real time user input for Expenditure, auto get date
	void addEntry(const string curr, const double, const string dc, const double cpay);  //real time user input for CreditExpenditure
	void dropEntry();                       					                       //delete last entry
 
    void printVctr();                     //print all entries
    
    //print entries within specified range of date; mode0 per day, 1 per month, 2 per year, 3 per entry   //note here, can't make this const function due to iterator
    void printVctrRange(const string &startDate, const string &endDate, const dateMode_t &mode);  
    
    void exportVctr(const char* fName);   //export current content of a vector to csv fName 
    void loadVctr(const char* fName);     //load content of csv to vector, function depends on file name
	
};
   
   
//-------------------------------------------
//free functions for comparing expenditures
//--------------------------------------------

bool expDateLessThan(const Expenditure* exp1, const Expenditure* exp2);  //needed by lowerbound function

    
